/** Browser drafts store bytes in IndexedDB, never session-bound object URLs. */
export interface ProjectSnapshot<T = any, F = any> {
  config: T
  fonts: F[]
  assets: Record<string, Blob>
}

export async function captureProjectSnapshot<T, F>(config: T, fonts: F[]): Promise<ProjectSnapshot<T, F>> {
  const assets: Record<string, Blob> = {}
  const references = new Map<string, string>()
  const pending: Promise<void>[] = []
  const visit = (value: any): any => {
    if (typeof value === 'string' && value.startsWith('blob:')) {
      let ref = references.get(value)
      if (!ref) {
        ref = `local-asset://${references.size}`
        references.set(value, ref)
        const assetRef = ref
        // Start all requests before yielding, so canvas teardown cannot revoke unread URLs.
        pending.push(fetch(value).then(async (response) => {
          if (!response.ok) throw new Error('Unable to save local project asset')
          assets[assetRef] = await response.blob()
        }))
      }
      return ref
    }
    if (Array.isArray(value)) return value.map(visit)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child)]))
    return value
  }
  const result = { config: visit(config), fonts: visit(fonts), assets }
  await Promise.all(pending)
  return result
}

export function restoreProjectSnapshot<T, F>(snapshot: ProjectSnapshot<T, F>): { config: T; fonts: F[] } {
  const urls = new Map<string, string>()
  const visit = (value: any): any => {
    if (typeof value === 'string' && value.startsWith('local-asset://')) {
      if (!snapshot.assets[value]) throw new Error(`Local draft asset is missing: ${value}`)
      if (!urls.has(value)) urls.set(value, URL.createObjectURL(snapshot.assets[value]))
      return urls.get(value)
    }
    if (Array.isArray(value)) return value.map(visit)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child)]))
    return value
  }
  return { config: visit(snapshot.config), fonts: visit(snapshot.fonts) }
}

export interface StoredProjectDraft extends ProjectSnapshot {
  savedAt: number
  fontBuildFiles?: Map<string, Map<string, Blob>>
  archiveExtras?: typeof import('./packageAssetRegistry').packageArchiveExtras
}
const openDraftDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open('wristo-project-drafts', 1)
  request.onupgradeneeded = () => request.result.createObjectStore('drafts')
  request.onerror = () => reject(request.error)
  request.onsuccess = () => resolve(request.result)
})

export async function accessProjectDraft(key: string, action: 'read' | 'write' | 'delete', draft?: StoredProjectDraft): Promise<StoredProjectDraft | undefined> {
  const db = await openDraftDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', action === 'read' ? 'readonly' : 'readwrite')
      const store = transaction.objectStore('drafts')
      const request = action === 'read' ? store.get(key) : action === 'write' ? store.put(draft, key) : store.delete(key)
      transaction.oncomplete = () => resolve(action === 'read' ? request.result : undefined)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error || new Error('Local draft transaction aborted'))
    })
  } finally {
    db.close()
  }
}
