type PersistBlobAssetDependencies = {
  fetchBlob?: (url: string) => Promise<Blob>
  uploadFile?: (file: File) => Promise<string>
}

type BlobOccurrence = {
  url: string
  path: string
  parent: Record<string, unknown> | unknown[]
  key: string | number
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const isBlobUrl = (value: unknown): value is string => (
  typeof value === 'string' && /^blob:/i.test(value.trim())
)

const childPath = (path: string, key: string | number): string => {
  if (typeof key === 'number') return `${path}[${key}]`
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`
}

const collectBlobOccurrences = (value: unknown, path = '$'): BlobOccurrence[] => {
  const occurrences: BlobOccurrence[] = []

  const visit = (current: unknown, currentPath: string): void => {
    if (!current || typeof current !== 'object') return
    if (Array.isArray(current)) {
      current.forEach((child, index) => {
        const pathForChild = childPath(currentPath, index)
        if (isBlobUrl(child)) {
          occurrences.push({ url: child.trim(), path: pathForChild, parent: current, key: index })
        } else {
          visit(child, pathForChild)
        }
      })
      return
    }
    Object.entries(current as Record<string, unknown>).forEach(([key, child]) => {
      const pathForChild = childPath(currentPath, key)
      if (isBlobUrl(child)) {
        occurrences.push({
          url: child.trim(),
          path: pathForChild,
          parent: current as Record<string, unknown>,
          key,
        })
      } else {
        visit(child, pathForChild)
      }
    })
  }

  visit(value, path)
  return occurrences
}

const defaultFetchBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`failed to read blob (${response.status})`)
  return response.blob()
}

const defaultUploadFile = async (file: File): Promise<string> => {
  const { uploadPersistentDesignAsset } = await import('@/api/wristo/upload')
  return uploadPersistentDesignAsset(file)
}

export class BlobAssetPersistenceError extends Error {
  readonly path: string

  constructor(path: string, message: string) {
    super(`Failed to persist design asset at ${path}: ${message}`)
    this.name = 'BlobAssetPersistenceError'
    this.path = path
  }
}

const persistOne = async (
  url: string,
  path: string,
  fetchBlob: (url: string) => Promise<Blob>,
  uploadFile: (file: File) => Promise<string>,
): Promise<string> => {
  try {
    const blob = await fetchBlob(url)
    const extension = MIME_EXTENSIONS[String(blob.type || '').toLowerCase()] || 'bin'
    const persistedUrl = String(await uploadFile(new File([blob], `design-asset.${extension}`, {
      type: blob.type || 'application/octet-stream',
    })) || '').trim()
    if (!persistedUrl || /^blob:/i.test(persistedUrl)) {
      throw new Error('upload returned an invalid URL')
    }
    return persistedUrl
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new BlobAssetPersistenceError(path, message)
  }
}

export async function persistBlobAssetUrls<T>(
  input: T,
  dependencies: PersistBlobAssetDependencies = {},
): Promise<T> {
  const cloned = structuredClone(input)
  const occurrences = collectBlobOccurrences(cloned)
  const uploadByUrl = new Map<string, Promise<string>>()
  const fetchBlob = dependencies.fetchBlob || defaultFetchBlob
  const uploadFile = dependencies.uploadFile || defaultUploadFile

  for (const occurrence of occurrences) {
    let upload = uploadByUrl.get(occurrence.url)
    if (!upload) {
      upload = persistOne(occurrence.url, occurrence.path, fetchBlob, uploadFile)
      uploadByUrl.set(occurrence.url, upload)
    }
    occurrence.parent[occurrence.key as never] = await upload as never
  }

  const remaining = collectBlobOccurrences(cloned)[0]
  if (remaining) {
    throw new BlobAssetPersistenceError(remaining.path, 'blob URL remained after upload')
  }
  return cloned
}

export async function persistAndSaveDesignConfig<T>(
  input: T,
  save: (persistedConfig: T) => Promise<void>,
  persist: (input: T) => Promise<T> = persistBlobAssetUrls,
): Promise<T> {
  const persistedConfig = await persist(input)
  await save(persistedConfig)
  return persistedConfig
}
