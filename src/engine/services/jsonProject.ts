import type { RuntimeDesignConfig } from '@/types/app/config'
import type { SaveWrtProgress } from './saveWrtProject'
import { designApi } from '@/api/wristo/design'
import { uploadPersistentDesignAsset } from '@/api/wristo/upload'
import { migrateWeekdayTokens } from '@/engine/expression/weekdayTokenMigration'
import { packageFonts, packageFontBuildFiles, packageBitmapChars, packageArchiveExtras } from './packageAssetRegistry'

type FileRefs = Array<[string, string]>
export interface JsonProjectResources {
  version: 1
  fonts: Array<[string, any]>
  bitmapChars: Array<[number, any[]]>
  fontBuildFiles: Array<[string, FileRefs]>
  files: FileRefs
  productImages: typeof packageArchiveExtras.productImages
  preview?: typeof packageArchiveExtras.preview
}
let deferredBuildFiles: JsonProjectResources['fontBuildFiles'] = []
let deferredFiles: FileRefs = []
// Local URLs and Blob bytes are immutable. Repeated saves reuse their successful uploads.
const uploadedUrls = new Map<string, Promise<string>>()
const uploadedBlobs = new WeakMap<Blob, Promise<string>>()
const extensions: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp',
  'image/gif': 'gif', 'font/ttf': 'ttf', 'font/otf': 'otf', 'application/json': 'json',
}
async function readBlob(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to read project resource')
  return response.blob()
}
function uploadBlob(blob: Blob, name?: string): Promise<string> {
  let pending = uploadedBlobs.get(blob)
  if (!pending) {
    pending = uploadPersistentDesignAsset(new File([blob], name || `asset.${extensions[blob.type] || 'bin'}`, { type: blob.type || 'application/octet-stream' }))
      .catch(error => { uploadedBlobs.delete(blob); throw error })
    uploadedBlobs.set(blob, pending)
  }
  return pending
}
function needsPersistence(value: string): boolean {
  if (/^(blob:|data:)/i.test(value)) return true
  if (!/^https?:\/\//i.test(value)) return false
  // Library responses can contain short-lived OSS/S3 URLs. Never persist their expiry.
  const keys = [...new URL(value).searchParams.keys()].map(key => key.toLowerCase())
  return keys.some(key => ['signature', 'ossaccesskeyid', 'x-amz-signature', 'x-oss-signature', 'x-oss-credential'].includes(key))
}
async function persistValue(value: any): Promise<any> {
  if (typeof value === 'string' && needsPersistence(value)) {
    let pending = uploadedUrls.get(value)
    if (!pending) {
      pending = readBlob(value).then(blob => uploadBlob(blob)).catch(error => { uploadedUrls.delete(value); throw error })
      uploadedUrls.set(value, pending)
    }
    return pending
  }
  if (Array.isArray(value)) {
    const result = []
    for (const child of value) result.push(await persistValue(child))
    return result
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) result[key] = await persistValue(child)
    return result
  }
  return value
}
export function clearJsonProjectFiles(): void {
  deferredBuildFiles = []
  deferredFiles = []
}
export function isJsonProject(config: RuntimeDesignConfig): boolean {
  return config?.studioResources?.version === 1
}
/** Registers metadata only. Compilation resources are deliberately lazy. */
export function restoreJsonProject(config: RuntimeDesignConfig): RuntimeDesignConfig {
  const resources = config.studioResources
  if (!resources || resources.version !== 1) throw new Error('Unsupported JSON project resources')
  packageFonts.clear(); packageFontBuildFiles.clear(); packageBitmapChars.clear(); packageArchiveExtras.files.clear()
  for (const [slug, font] of resources.fonts || []) packageFonts.set(slug, font)
  for (const [id, chars] of resources.bitmapChars || []) packageBitmapChars.set(id, chars)
  deferredBuildFiles = resources.fontBuildFiles || []
  deferredFiles = resources.files || []
  packageArchiveExtras.productImages = resources.productImages || []
  packageArchiveExtras.preview = resources.preview
  return config
}
/** Called only by WRT export/build, never by the editor load path. */
export async function hydrateJsonProjectFiles(): Promise<void> {
  for (const [slug, files] of deferredBuildFiles) {
    const target = packageFontBuildFiles.get(slug) || new Map<string, Blob>()
    for (const [path, url] of files) if (!target.has(path)) {
      const blob = await readBlob(url); uploadedBlobs.set(blob, Promise.resolve(url)); target.set(path, blob)
    }
    packageFontBuildFiles.set(slug, target)
  }
  for (const [path, url] of deferredFiles) if (!packageArchiveExtras.files.has(path)) {
    const blob = await readBlob(url); uploadedBlobs.set(blob, Promise.resolve(url)); packageArchiveExtras.files.set(path, blob)
  }
}
async function snapshotResources(): Promise<JsonProjectResources> {
  const builds = new Map(deferredBuildFiles.map(([slug, files]) => [slug, new Map(files)]))
  for (const [slug, files] of packageFontBuildFiles) {
    const refs = builds.get(slug) || new Map<string, string>()
    for (const [path, blob] of files) refs.set(path, await uploadBlob(blob, path.split('/').pop()))
    builds.set(slug, refs)
  }
  const files = new Map(deferredFiles)
  for (const [path, blob] of packageArchiveExtras.files) files.set(path, await uploadBlob(blob, path.split('/').pop()))
  return persistValue({ version: 1, fonts: [...packageFonts], bitmapChars: [...packageBitmapChars],
    fontBuildFiles: [...builds].map(([slug, refs]) => [slug, [...refs]]), files: [...files],
    productImages: packageArchiveExtras.productImages, preview: packageArchiveExtras.preview })
}
export async function saveJsonProject(designUid: string, config: RuntimeDesignConfig,
  options: { previewDataUrl?: string | null; onSaveProgress?: (progress: SaveWrtProgress) => void } = {}) {
  if (!designUid) throw new Error('A design ID is required to save a project')
  options.onSaveProgress?.({ stage: 'assets' })
  const { studioResources: _previous, ...design } = config
  const persisted = await persistValue(migrateWeekdayTokens({ ...design, designId: designUid }))
  persisted.studioResources = await snapshotResources()
  const preview = options.previewDataUrl ? await persistValue(options.previewDataUrl) : undefined
  options.onSaveProgress?.({ stage: 'uploading' })
  const response = await designApi.updateDesign({ uid: designUid, name: config.name, configJson: persisted,
    ...(preview ? { coverImage: { url: preview, type: 'screenshot', usageType: 'screenshot' } } : {}) } as any)
  if (response.code !== 0 || !response.data) throw new Error(response.msg || 'Failed to save JSON project')
  options.onSaveProgress?.({ stage: 'saved' })
  return response.data
}

/** Build a saved design without replacing the resources of an open editor. */
export async function withJsonProjectResources<T>(config: RuntimeDesignConfig, run: () => Promise<T>): Promise<T> {
  const fonts = [...packageFonts], builds = [...packageFontBuildFiles], chars = [...packageBitmapChars]
  const files = [...packageArchiveExtras.files], images = packageArchiveExtras.productImages, preview = packageArchiveExtras.preview
  const oldDeferredBuilds = deferredBuildFiles, oldDeferredFiles = deferredFiles
  try { restoreJsonProject(config); return await run() }
  finally {
    packageFonts.clear(); fonts.forEach(([key, value]) => packageFonts.set(key, value))
    packageFontBuildFiles.clear(); builds.forEach(([key, value]) => packageFontBuildFiles.set(key, value))
    packageBitmapChars.clear(); chars.forEach(([key, value]) => packageBitmapChars.set(key, value))
    packageArchiveExtras.files.clear(); files.forEach(([key, value]) => packageArchiveExtras.files.set(key, value))
    packageArchiveExtras.productImages = images; packageArchiveExtras.preview = preview
    deferredBuildFiles = oldDeferredBuilds; deferredFiles = oldDeferredFiles
  }
}
