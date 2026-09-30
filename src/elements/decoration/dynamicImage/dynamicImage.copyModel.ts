import JSZip from 'jszip'
import { getBundleAssetMimeType } from '@/engine/services/bundleAssetMime'
import type { DynamicImageItem } from '@/types/elements/dynamicImage'
import { toRaw } from 'vue'

export interface CopyableDynamicImageGroup {
  id: string
  label: string
  items: DynamicImageItem[]
}

const parseDesignConfig = (config: unknown): Record<string, unknown> | null => {
  if (typeof config === 'string') {
    try {
      const parsed = JSON.parse(config)
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  }
  return config && typeof config === 'object' ? config as Record<string, unknown> : null
}

export const extractDynamicImageGroups = (config: unknown): CopyableDynamicImageGroup[] => {
  const parsed = parseDesignConfig(config)
  const elements = Array.isArray(parsed?.elements) ? parsed.elements : []
  let dynamicGroupIndex = 0

  return elements.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return []
    const element = candidate as Record<string, unknown>
    if (element.eleType !== 'dynamicImage') return []
    if (!Array.isArray(element.items) || element.items.length === 0) return []
    dynamicGroupIndex += 1

    const layerName = typeof element.layerName === 'string' ? element.layerName.trim() : ''
    return [{
      id: String(element.id || `dynamic-image-${dynamicGroupIndex}`),
      label: layerName || `Dynamic image group ${dynamicGroupIndex}`,
      items: element.items as DynamicImageItem[],
    }]
  })
}

export const appendCopiedDynamicImageItems = (
  currentItems: DynamicImageItem[],
  sourceItems: DynamicImageItem[],
  createId: () => string,
): DynamicImageItem[] => [
  ...currentItems,
  ...sourceItems.map(item => ({
    ...structuredClone(toRaw(item)),
    id: createId(),
  })),
]


// Read only the source images: the full design loader clears the active project's
// asset registries and object URLs. Data URLs also survive closing this dialog.
export const loadCopyableDynamicImageGroups = async (
  config: unknown,
  assetBundleUrl?: string | null,
): Promise<CopyableDynamicImageGroup[]> => {
  let zip: JSZip | undefined
  let manifest: { design?: { path?: string }; studio?: { configPath?: string; assetRefs?: Array<{ path: string; sourceRef?: string; sourceUrl?: string; mimeType?: string }> } } | undefined
  if (assetBundleUrl?.trim()) {
    const url = assetBundleUrl.trim()
    const response = await fetch(/^(https?:|data:|blob:|\/)/.test(url) ? url : `/${url}`)
    if (!response.ok) throw new Error('Failed to load source design assets')
    const archive = await JSZip.loadAsync(await response.arrayBuffer())
    const nested = Object.keys(archive.files).filter(path => /^[^/]+\/manifest\.json$/.test(path))
    zip = !archive.file('manifest.json') && nested.length === 1
      ? archive.folder(nested[0].slice(0, -'manifest.json'.length))!
      : archive
    const manifestFile = zip.file('manifest.json')
    if (!manifestFile) throw new Error('Source design asset manifest is missing')
    manifest = JSON.parse(await manifestFile.async('string'))
    const configPath = manifest?.design?.path || manifest?.studio?.configPath
    if (configPath) {
      const configFile = zip.file(configPath)
      if (!configFile) throw new Error('Source design configuration is missing')
      config = JSON.parse(await configFile.async('string'))
    }
  }
  const groups = structuredClone(extractDynamicImageGroups(config))
  const images = new Map<string, string>()
  for (const group of groups) for (const item of group.items) {
    const reference = item.imageUrl
    const asset = manifest?.studio?.assetRefs?.find(ref => ref.sourceRef === reference || ref.sourceUrl === reference || `bundle://${ref.path}` === reference)
    const path = reference?.startsWith('bundle://') ? reference.slice('bundle://'.length) : asset?.path
    if (path) {
      const file = zip?.file(path)
      if (!file) throw new Error(`Source design image is missing: ${path}`)
      if (!images.has(path)) images.set(path, `data:${asset?.mimeType || getBundleAssetMimeType(path)};base64,${await file.async('base64')}`)
      item.imageUrl = images.get(path)!
    } else if (!reference || reference.startsWith('blob:')) {
      throw new Error('Source design image is unavailable')
    }
  }
  return groups
}
