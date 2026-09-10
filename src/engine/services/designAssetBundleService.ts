import JSZip from 'jszip'
import { assertSelfContainedSvg } from './selfContainedSvg'
import { packageFonts, packageFontBuildFiles, packageBitmapChars, packageArchiveExtras } from './packageAssetRegistry'
import { listBitmapFontChars } from '@/api/wristo/bitmapFont'
import { canonicalFontSlug } from '@/features/bitmap-font-maker/fontSlug'
import { getBundleAssetMimeType } from '@/engine/services/bundleAssetMime'
import type { RuntimeDesignConfig } from '@/types/app/config'
import type { AnyElementConfig } from '@/types/elements'
import { getFontBySlug } from '@/api/wristo/fonts'
import { useAmoledIconAssetStore } from '@/stores/amoledIconAssetStore'
import { normalizeIconUnicode } from '@/types/amoledIcons'
import type { ProductImageItem } from '@/types/product'
import type { Image } from '@/types/api/image'
import {
  addGalleryMarketingImage,
  addScalarMarketingImage,
  createMarketingAssetInputs,
  type MarketingImageManifest,
} from '@/engine/services/marketingAssetBundle'
import {
  resolveBackendImageRecord,
  writeImageVariants,
  type ImageVariantManifest,
} from '@/engine/services/imageVariantBundle'
import type { VisualThemesConfig } from '@/types/visualTheme'

type ManifestIconAsset = {
  sha256?: string
  iconUnicode: string
  path?: string
  format?: string
  sourceUrl?: string
  symbolCode?: string
  metricSymbol?: string
  label?: string
  assetSource?: string
}

type ManifestElement = {
  id: string
  type: string
  path: string
}

type WatchfaceAssetGroups = {
  preview: string
  background: string[]
  time: string[]
  icons: string[]
  modules: string[]
  rings: string[]
  markers: string[]
  hands: string[]
  panels: string[]
  dividers: string[]
  badges: string[]
  overlays: string[]
  fonts: string[]
}

type ManifestAsset = {
  id: string
  category: string
  path: string
  format: string
  mimeType?: string
  sourceUrl?: string
  sourceRef?: string
  elementId?: string
  elementType?: string
  field?: string
  sha256?: string
  width?: number
  height?: number
  variants?: Record<string, ImageVariantManifest>
}

type ManifestFontAsset = {
  sha256?: string
  buildPath?: string
  buildFiles?: Array<{ path: string; sha256: string }>
  slug: string
  path?: string
  format?: string
  mimeType?: string
  sourceUrl?: string
  metadata?: Record<string, unknown>
}

export type ManifestFailure = {
  category: string
  sourceUrl?: string
  elementId?: string
  field?: string
  message: string
}

type DesignAssetManifest = {
  selfContained?: boolean
  version: 1 | 2
  format?: string
  generatedAt: string
  designUid: string
  designName?: string
  appId?: number
  name?: string
  slug?: string
  category?: 'watchface-kit'
  style?: string[]
  canvas?: {
    width: number
    height: number
    center: [number, number]
    shape: 'round' | 'square'
  }
  palette?: {
    background: string
    primary: string
    accent: string
  }
  recommendedFields?: string[]
  assets: WatchfaceAssetGroups
  design?: {
    path: string
  }
  elements?: ManifestElement[]
  fonts?: ManifestFontAsset[]
  bitmapFonts?: Array<{ id: number; chars: Array<{ charValue: string; path: string; sha256: string }> }>
  failures?: ManifestFailure[]
  icons?: {
    amoled: ManifestIconAsset[]
  }
  preview?: { path: string; sha256: string }
  productImages?: MarketingImageManifest[]
  studio?: {
    configPath: string
    elementsPath: string
    assetRefs: ManifestAsset[]
  }
}

type BuildDesignAssetBundleOptions = {
  /** Weighted work progress, not elapsed time. 100 means the file is ready. */
  onProgress?: (percent: number) => void
  previewDataUrl?: string | null
  appId?: number | null
  product?: {
    garminImageUrl?: string | null
    heroImageUrl?: string | null
    rawImageUrl?: string | null
    bannerImageUrl?: string | null
    productImages?: ProductImageItem[]
  }
  /** @deprecated Use product. */
  productImages?: {
    heroImageUrl?: string | null
    rawImageUrl?: string | null
  }
}

type RestoreBundleOptions = {
  preserveConfig?: boolean
  assetBundleUrl?: string | null
}

export const WRT_FORMAT = 'wristo-design-package'
export const WRT_VERSION = 2

export class WrtDesignPackageError extends Error {
  readonly code: 'invalid-file' | 'invalid-archive' | 'invalid-manifest' | 'unsupported-version' | 'invalid-design'

  constructor(
    code: WrtDesignPackageError['code'],
    message: string,
  ) {
    super(message)
    this.name = 'WrtDesignPackageError'
    this.code = code
  }
}

export type ImportedWrtDesignPackage = {
  config: RuntimeDesignConfig
  sourceName: string
  failures: ManifestFailure[]
}

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value)
const isDataUrl = (value: string): boolean => /^data:/i.test(value)
const isBlobUrl = (value: string): boolean => /^blob:/i.test(value)

const restoredDesignAssetUrls = new Set<string>()

/** Call after a successfully imported design replaces the current canvas, and when that canvas unmounts. */
export const clearRestoredDesignAssetUrls = (): void => {
  restoredDesignAssetUrls.forEach((url) => URL.revokeObjectURL(url))
  restoredDesignAssetUrls.clear()
}

const ASSET_URL_FIELDS = new Set([
  'imageUrl',
  'imageSvg',
  'amoledImageUrl',
  'moonImageUrl',
  'wristoImageUrl',
  'previewUrl',
  'svgFile',
  'fileUrl',
  'src',
  'url',
  'bitmapPreviewAtlasUrl',
  'bitmapPreviewDescriptorUrl',
  'bitmapCanvasPreviewAtlasUrl',
  'bitmapCanvasPreviewDescriptorUrl',
])

const FONT_FIELDS = new Set(['fontFamily', 'iconFont', 'assetFontFamily'])

const toAbsoluteUrl = (url: string): string => {
  if (!url) return ''
  if (isHttpUrl(url) || isDataUrl(url) || isBlobUrl(url)) return url
  if (url.startsWith('//')) return `${window.location.protocol}${url}`
  if (url.startsWith('/')) return url
  return `/${url}`
}

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl)
  return response.blob()
}

const getAmoledIconElements = (config: RuntimeDesignConfig): AnyElementConfig[] => {
  return (config.elements || []).filter((element: any) => {
    return element?.eleType === 'icon' && (element.iconDisplayType || 'mip') === 'amoled'
  })
}

const parseManifest = async (zip: JSZip): Promise<DesignAssetManifest | null> => {
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) return null
  try {
    return JSON.parse(await manifestFile.async('string')) as DesignAssetManifest
  } catch (error) {
    console.warn('[designAssetBundle] Failed to parse manifest.json', error)
    return null
  }
}

const getIconUnicodeFromPath = (path: string): string => {
  const fileName = path.split('/').pop() || ''
  return decodeURIComponent(fileName.replace(/\.[^.]+$/, '')).trim()
}

const getMimeTypeForBundlePath = (path: string): string => {
  return /\.png$/i.test(path) ? 'image/png' : 'image/svg+xml'
}

const getMimeTypeForFormat = (format: string): string => {
  const normalized = format.toLowerCase()
  if (normalized === 'png') return 'image/png'
  if (normalized === 'jpg' || normalized === 'jpeg') return 'image/jpeg'
  if (normalized === 'webp') return 'image/webp'
  if (normalized === 'gif') return 'image/gif'
  if (normalized === 'svg') return 'image/svg+xml'
  if (normalized === 'ttf') return 'font/ttf'
  if (normalized === 'otf') return 'font/otf'
  if (normalized === 'woff') return 'font/woff'
  if (normalized === 'woff2') return 'font/woff2'
  return 'application/octet-stream'
}

const getFormatFromSource = (source: string, fallback = 'bin'): string => {
  const mimeMatch = source.match(/^data:([^;,]+)/i)
  if (mimeMatch) {
    const mime = mimeMatch[1].toLowerCase()
    if (mime.includes('svg')) return 'svg'
    if (mime.includes('png')) return 'png'
    if (mime.includes('jpeg')) return 'jpg'
    if (mime.includes('webp')) return 'webp'
    if (mime.includes('gif')) return 'gif'
    if (mime.includes('ttf')) return 'ttf'
    if (mime.includes('opentype') || mime.includes('otf')) return 'otf'
    if (mime.includes('woff2')) return 'woff2'
    if (mime.includes('woff')) return 'woff'
  }
  const clean = source.split('?')[0].split('#')[0]
  const match = clean.match(/\.([a-z0-9]+)$/i)
  return match?.[1]?.toLowerCase() || fallback
}

const getFormatFromBlob = (blob: Blob, source: string, fallback = 'bin'): string => {
  const type = String(blob.type || '').toLowerCase()
  if (type.includes('svg')) return 'svg'
  if (type.includes('png')) return 'png'
  if (type.includes('jpeg')) return 'jpg'
  if (type.includes('webp')) return 'webp'
  if (type.includes('gif')) return 'gif'
  if (type.includes('ttf')) return 'ttf'
  if (type.includes('opentype') || type.includes('otf')) return 'otf'
  if (type.includes('woff2')) return 'woff2'
  if (type.includes('woff')) return 'woff'
  return getFormatFromSource(source, fallback)
}

const sanitizePathSegment = (value: string, fallback: string): string => {
  return String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || fallback
}

const createAssetGroups = (): WatchfaceAssetGroups => ({
  preview: 'preview.png',
  background: [],
  time: [],
  icons: [],
  modules: [],
  rings: [],
  markers: [],
  hands: [],
  panels: [],
  dividers: [],
  badges: [],
  overlays: [],
  fonts: [],
})

const pushAssetGroupPath = (assets: WatchfaceAssetGroups, group: keyof WatchfaceAssetGroups, path: string) => {
  if (group === 'preview') {
    assets.preview = path
    return
  }
  const list = assets[group]
  if (Array.isArray(list) && path && !list.includes(path)) {
    list.push(path)
  }
}

const slugifyDesignName = (value: string, fallback: string): string => {
  return sanitizePathSegment(value || fallback, fallback).toLowerCase()
}

const inferCanvas = (config: RuntimeDesignConfig): DesignAssetManifest['canvas'] => {
  const rawCanvas = (config as any).canvas || (config as any).designSpec || {}
  const width = Math.max(1, Math.round(Number(rawCanvas.width || 454)))
  const height = Math.max(1, Math.round(Number(rawCanvas.height || 454)))
  return {
    width,
    height,
    center: [Math.round(width / 2), Math.round(height / 2)],
    shape: width === height ? 'round' : 'square',
  }
}

const collectHexColors = (value: unknown, colors = new Set<string>()): Set<string> => {
  if (typeof value === 'string') {
    const matches = value.match(/#[0-9a-fA-F]{6}\b/g)
    matches?.forEach((color) => colors.add(color.toUpperCase()))
    return colors
  }
  if (!value || typeof value !== 'object') return colors
  if (Array.isArray(value)) {
    value.forEach((item) => collectHexColors(item, colors))
    return colors
  }
  Object.values(value as Record<string, unknown>).forEach((item) => collectHexColors(item, colors))
  return colors
}

const inferPalette = (config: RuntimeDesignConfig): DesignAssetManifest['palette'] => {
  const colors = Array.from(collectHexColors(config))
  return {
    background: colors.find((color) => color === '#000000') || colors[0] || '#000000',
    primary: colors.find((color) => color !== '#000000') || '#FFFFFF',
    accent: colors.find((color) => color !== '#000000' && color !== '#FFFFFF') || colors[1] || '#00D1FF',
  }
}

const inferRecommendedFields = (config: RuntimeDesignConfig): string[] => {
  const fields = new Set<string>()
  const add = (value: unknown) => {
    const normalized = String(value || '').trim()
    if (normalized) fields.add(normalized)
  }
  for (const element of config.elements || []) {
    add((element as any).dataProperty)
    add((element as any).goalProperty)
    add((element as any).chartProperty)
    add((element as any).textProperty)
    if ((element as any).eleType === 'time' || (element as any).type === 'time') fields.add('time')
    if ((element as any).eleType === 'date' || (element as any).type === 'date') fields.add('date')
  }
  return Array.from(fields)
}

const getAssetGroupForElementRef = (input: {
  category: string
  elementType?: string
  field?: string
}): keyof WatchfaceAssetGroups => {
  const category = String(input.category || '').toLowerCase()
  const elementType = String(input.elementType || '').toLowerCase()
  const field = String(input.field || '').toLowerCase()
  const combined = `${category} ${elementType} ${field}`
  if (combined.includes('background')) return 'background'
  if (combined.includes('hand') || combined.includes('centercap') || combined.includes('center_cap')) return 'hands'
  if (combined.includes('ring') || combined.includes('arc')) return 'rings'
  if (combined.includes('marker') || combined.includes('tick')) return 'markers'
  if (combined.includes('divider')) return 'dividers'
  if (combined.includes('badge')) return 'badges'
  if (combined.includes('overlay') || combined.includes('shadow') || combined.includes('glass')) return 'overlays'
  if (combined.includes('panel')) return 'panels'
  if (combined.includes('icon') || combined.includes('weather') || combined.includes('moon')) return 'icons'
  if (combined.includes('time') || combined.includes('digit') || combined.includes('colon')) return 'time'
  return 'modules'
}

const createReadme = (config: RuntimeDesignConfig, manifest: DesignAssetManifest): string => {
  return [
    `# ${config.name || 'Wristo Watch Face Asset Package'}`,
    '',
    '这是 Wristo Studio 导出的表盘素材包，后续 Connect IQ 打包应优先读取 `manifest.json`。',
    '',
    '- `manifest.json`: 表盘素材规范入口，包含画布、推荐字段、素材分组和 Studio 扩展信息。',
    '- `config/config.json`: 当前仍在运行时使用的完整 configJson。',
    '- `design.json`: 兼容旧 Studio 恢复流程的完整 configJson 副本。',
    '- `elements/`: 按元素拆分的完整配置快照。',
    '- `assets/`, `fonts/`, `weather/`, `icons/`: configJson 引用到的可下载素材文件。',
    '- `preview.png`: 当前画布预览图；如果导出时无法截图，会使用占位预览。',
    '',
    `Design UID: ${manifest.designUid || '-'}`,
    `Generated At: ${manifest.generatedAt}`,
  ].join('\n')
}

const getElementId = (element: AnyElementConfig, index: number): string => {
  return String((element as any).id || `element-${index + 1}`)
}

const getElementType = (element: AnyElementConfig): string => {
  return String((element as any).eleType || (element as any).type || 'element')
}

const collectElementAssetRefs = (element: AnyElementConfig, index: number) => {
  const refs: Array<{
    elementId: string
    elementType: string
    field: string
    source: string
  }> = []
  const elementId = getElementId(element, index)
  const elementType = getElementType(element)

  const walk = (value: unknown, key = '') => {
    if (typeof value === 'string') {
      const source = value.trim()
      if (source && ASSET_URL_FIELDS.has(key)) {
        refs.push({
          elementId,
          elementType,
          field: key,
          source,
        })
      }
      return
    }
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, key))
      return
    }
    Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
      walk(childValue, childKey)
    })
  }

  walk(element)
  return refs
}

export const collectVisualThemeAssetRefs = (visualThemes: VisualThemesConfig | undefined) => {
  if (!visualThemes) return []
  return visualThemes.themes.flatMap((theme) =>
    (['background', 'hourHand', 'minuteHand', 'secondHand', 'centerCap'] as const)
      .flatMap((slot) => {
        const source = theme.assets[slot]?.imageUrl?.trim()
        if (!source) return []
        return [{
          elementId: `theme-${theme.id}-${slot}`,
          elementType: slot === 'background' ? 'background' : slot,
          field: slot,
          source,
          category: slot === 'background' ? 'background' : 'hands',
        }]
      }),
  )
}

export const collectFontSlugs = (config: RuntimeDesignConfig): string[] => {
  const slugs = new Set<string>()
  const walk = (value: unknown, key = '') => {
    if (typeof value === 'string') {
      const slug = value.trim()
      if (slug && FONT_FIELDS.has(key)) slugs.add(slug)
      return
    }
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, key))
      return
    }
    const record = value as Record<string, unknown>
    Object.entries(record).forEach(([childKey, childValue]) => {
      walk(childValue, childKey)
    })
  }

  walk(config)
  return Array.from(slugs)
}

const getBundleIconAssetEntries = (zip: JSZip, manifest: DesignAssetManifest | null): ManifestIconAsset[] => {
  if (manifest?.icons?.amoled?.length) {
    return manifest.icons.amoled.filter((item) => item?.iconUnicode)
  }

  return Object.keys(zip.files)
    .filter((path) => /^(?:assets\/)?icons\/amoled\/[^/]+\.(svg|png)$/i.test(path) && !zip.files[path].dir)
    .map((path) => {
      const iconUnicode = getIconUnicodeFromPath(path)
      const format = /\.png$/i.test(path) ? 'png' : 'svg'
      return {
        iconUnicode,
        path,
        format,
        assetSource: 'custom',
      }
    })
    .filter((item) => item.iconUnicode)
}

const getFileFormat = (file?: File): 'svg' | 'png' => {
  if (!file) return 'svg'
  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  return type === 'image/png' || name.endsWith('.png') ? 'png' : 'svg'
}

const fetchBlob = async (source: string): Promise<Blob> => {
  const normalized = toAbsoluteUrl(source)
  if (!normalized) throw new Error('Empty asset source')
  if (isDataUrl(normalized)) return dataUrlToBlob(normalized)
  const response = await fetch(normalized)
  if (!response.ok) {
    throw new Error(`Failed to fetch asset: ${normalized}`)
  }
  return response.blob()
}

const sha256Hex = async (blob: Blob): Promise<string> => {
  const bytes = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const readImageDimensions = async (blob: Blob, format: string): Promise<{ width?: number; height?: number }> => {
  if (format === 'svg') {
    const source = await blob.text()
    const width = Number(source.match(/\bwidth=["']([0-9.]+)/i)?.[1])
    const height = Number(source.match(/\bheight=["']([0-9.]+)/i)?.[1])
    if (Number.isFinite(width) && Number.isFinite(height)) return { width, height }
    const viewBox = source.match(/\bviewBox=["'][^"']*?([0-9.]+)[ ,]+([0-9.]+)["']/i)
    if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) }
  }
  if (format === 'png') {
    const bytes = new DataView(await blob.arrayBuffer())
    if (bytes.byteLength >= 24) return { width: bytes.getUint32(16), height: bytes.getUint32(20) }
  }
  return {}
}

const addReferencedAssetToBundle = async (
  zip: JSZip,
  manifest: DesignAssetManifest,
  sourcePathByUrl: Map<string, ManifestAsset>,
  contentAssetByHash: Map<string, ManifestAsset>,
  usedPaths: Set<string>,
  input: {
    source: string
    category: string
    elementId?: string
    elementType?: string
    field?: string
  },
) => {
  const source = String(input.source || '').trim()
  if (!source) return

  const existing = sourcePathByUrl.get(source)
  if (existing) {
    pushAssetGroupPath(manifest.assets, getAssetGroupForElementRef(input), existing.path)
    manifest.studio?.assetRefs.push({
      ...existing,
      id: `${existing.id}-ref-${manifest.studio?.assetRefs.length || 0}`,
      category: input.category,
      sourceUrl: isDataUrl(source) || isBlobUrl(source) ? undefined : source,
      sourceRef: source,
      elementId: input.elementId,
      elementType: input.elementType,
      field: input.field,
    })
    return
  }

  const backendImage = manifest.selfContained ? null : await resolveBackendImageRecord(source)
  if (backendImage) {
    const group = getAssetGroupForElementRef(input)
    const safeName = sanitizePathSegment(backendImage.name || input.field || 'image', 'image')
      .replace(/\.[^.]+$/, '')
    const variants = await writeImageVariants(zip, {
      imageId: backendImage.id,
      basePath: `assets/${group}/${backendImage.id}-${safeName}`,
      image: backendImage,
    })
    variants.forEach((variant) => pushAssetGroupPath(manifest.assets, group, variant.path))
    const original = variants.find((variant) => variant.name === 'original') || variants[0]
    const asset: ManifestAsset = {
      id: `asset-${sourcePathByUrl.size + 1}`,
      category: input.category,
      path: original.path,
      format: original.format,
      mimeType: original.mimeType,
      sourceUrl: source,
      sourceRef: source,
      elementId: input.elementId,
      elementType: input.elementType,
      field: input.field,
      sha256: original.sha256,
      width: original.width,
      height: original.height,
      variants: Object.fromEntries(variants.map((variant) => [variant.name, variant])),
    }
    sourcePathByUrl.set(source, asset)
    contentAssetByHash.set(original.sha256, asset)
    manifest.studio?.assetRefs.push(asset)
    return
  }

  try {
    const blob = await fetchBlob(source)
    const format = getFormatFromBlob(blob, source)
    if (manifest.selfContained && format === 'svg') assertSelfContainedSvg(await blob.text())
    const sha256 = await sha256Hex(blob)
    const dimensions = await readImageDimensions(blob, format)
    const duplicateContent = contentAssetByHash.get(sha256)
    if (duplicateContent) {
      const duplicateRef: ManifestAsset = {
        ...duplicateContent,
        id: `${duplicateContent.id}-ref-${manifest.studio?.assetRefs.length || 0}`,
        category: input.category,
        sourceUrl: isDataUrl(source) || isBlobUrl(source) ? undefined : source,
        sourceRef: source,
        elementId: input.elementId,
        elementType: input.elementType,
        field: input.field,
      }
      sourcePathByUrl.set(source, duplicateRef)
      pushAssetGroupPath(manifest.assets, getAssetGroupForElementRef(input), duplicateRef.path)
      manifest.studio?.assetRefs.push(duplicateRef)
      return
    }
    const elementPart = sanitizePathSegment(input.elementId || input.category, input.category)
    const fieldPart = sanitizePathSegment(input.field || 'asset', 'asset')
    let path = `assets/${sanitizePathSegment(input.category, 'asset')}/${elementPart}-${fieldPart}.${format}`
    let suffix = 1
    while (usedPaths.has(path)) {
      suffix += 1
      path = `assets/${sanitizePathSegment(input.category, 'asset')}/${elementPart}-${fieldPart}-${suffix}.${format}`
    }
    usedPaths.add(path)
    zip.file(path, await blob.arrayBuffer())

    const asset: ManifestAsset = {
      id: `asset-${sourcePathByUrl.size + 1}`,
      category: input.category,
      path,
      format,
      mimeType: blob.type || getMimeTypeForFormat(format),
      sourceUrl: isDataUrl(source) || isBlobUrl(source) ? undefined : source,
      sourceRef: source,
      elementId: input.elementId,
      elementType: input.elementType,
      field: input.field,
      sha256,
      ...dimensions,
    }
    sourcePathByUrl.set(source, asset)
    contentAssetByHash.set(sha256, asset)
    manifest.studio?.assetRefs.push(asset)
    pushAssetGroupPath(manifest.assets, getAssetGroupForElementRef(input), path)
  } catch (error: any) {
    manifest.failures?.push({
      category: input.category,
      sourceUrl: isDataUrl(source) || isBlobUrl(source) ? undefined : source,
      elementId: input.elementId,
      field: input.field,
      message: error?.message || String(error),
    })
  }
}

const addFontAssetToBundle = async (
  zip: JSZip,
  manifest: DesignAssetManifest,
  usedPaths: Set<string>,
  slug: string,
) => {
  try {
    const cached = packageFonts.get(canonicalFontSlug(slug))
    const font = cached || (await getFontBySlug(slug)).data
    const source = font?.ttfFile?.url
    if (!font || (!source && !font.bitmapPreviewDescriptorUrl)) {
      throw new Error(`Missing font file: ${slug}`)
    }

    const blob = source ? await fetchBlob(source) : null
    const format = blob ? getFormatFromBlob(blob, source!, 'ttf') : undefined
    const safeSlug = sanitizePathSegment(slug, 'font')
    let path = `fonts/${safeSlug}.${format}`
    let suffix = 1
    while (usedPaths.has(path)) {
      suffix += 1
      path = `fonts/${safeSlug}-${suffix}.${format}`
    }
    usedPaths.add(path)
    if (blob) {
      zip.file(path, await blob.arrayBuffer())
      pushAssetGroupPath(manifest.assets, 'fonts', path)
    }
    const buildPath = `fonts/bitmaps/${safeSlug}`
    const buildFiles: Array<{ path: string; sha256: string }> = []
    if (manifest.selfContained && !slug.startsWith('local-')) {
      let files = packageFontBuildFiles.get(slug)
      if (!files) {
        const fontZip = await JSZip.loadAsync(await (await fetchBlob(`https://cdn.wristo.io/font-bitmaps/${encodeURIComponent(slug)}/${encodeURIComponent(slug)}.zip`)).arrayBuffer())
        files = new Map()
        for (const [name, entry] of Object.entries(fontZip.files)) {
          if (!entry.dir && !name.split('/').includes('..') && /\.(fnt|png)$/i.test(name)) files.set(name, new Blob([await entry.async('arraybuffer')]))
        }
        if (![...files.keys()].some(name => name.endsWith('.fnt'))) throw new Error(`Missing bitmap build files: ${slug}`)
        packageFontBuildFiles.set(slug, files)
      }
      for (const [name, content] of files) {
        const filePath = `${buildPath}/${name}`
        zip.file(filePath, await content.arrayBuffer())
        buildFiles.push({ path: filePath, sha256: await sha256Hex(content) })
      }
    }

    manifest.fonts?.push({
      slug,
      path: blob ? path : undefined,
      buildPath: manifest.selfContained && buildFiles.length ? buildPath : undefined,
      buildFiles: manifest.selfContained && buildFiles.length ? buildFiles : undefined,
      format,
      mimeType: blob ? blob.type || getMimeTypeForFormat(format!) : undefined,
      sourceUrl: source,
      sha256: blob ? await sha256Hex(blob) : undefined,
      metadata: { ...font, ttfFile: undefined },
    })
  } catch (error: any) {
    manifest.failures?.push({
      category: 'font',
      sourceUrl: slug,
      message: error?.message || String(error),
    })
  }
}

const addAmoledIconAssetToBundle = async (
  zip: JSZip,
  manifest: DesignAssetManifest,
  usedPaths: Set<string>,
  input: {
    iconUnicode: string
    symbolCode?: string
    metricSymbol?: string
    label?: string
    source?: string
    file?: File
    format?: 'svg' | 'png'
    assetSource?: string
  },
) => {
  const iconUnicode = normalizeIconUnicode(input.iconUnicode)
  if (!iconUnicode) return

  const existing = manifest.icons?.amoled.find((item) => normalizeIconUnicode(item.iconUnicode) === iconUnicode)
  if (existing?.path || (!input.file && !input.source)) {
    if (existing) return
  }

  const entry: ManifestIconAsset = {
    iconUnicode,
    symbolCode: input.symbolCode,
    metricSymbol: input.metricSymbol,
    label: input.label,
    assetSource: input.assetSource || (input.file ? 'custom' : 'system'),
  }

  if (input.file || input.source) {
    const format = input.format || getFileFormat(input.file)
    const path = `assets/icons/amoled/${iconUnicode}.${format}`
    if (!usedPaths.has(path)) {
      usedPaths.add(path)
      if (input.file) {
        zip.file(path, await input.file.arrayBuffer())
      } else if (input.source) {
        zip.file(path, await (await fetchBlob(input.source)).arrayBuffer())
      }
      if (manifest.selfContained && format === 'svg') assertSelfContainedSvg(await zip.file(path)!.async('string'))
      entry.sha256 = await sha256Hex(new Blob([await zip.file(path)!.async('arraybuffer')]))
      entry.path = path
      entry.format = format
      entry.sourceUrl = input.source && !isDataUrl(input.source) ? input.source : undefined
      pushAssetGroupPath(manifest.assets, 'icons', path)
    }
  }

  manifest.icons?.amoled.push(entry)
}

const buildDesignAssetArchive = async (
  config: RuntimeDesignConfig,
  options: BuildDesignAssetBundleOptions = {},
  packageOptions: { format?: string; version?: 1 | 2; fileNameSuffix: string; mimeType: string; rooted?: boolean },
): Promise<File> => {
  config = JSON.parse(JSON.stringify(config))
  if (packageOptions.format === WRT_FORMAT) {
    for (const element of config.elements || []) {
      if (element.eleType === 'weather' && (element as any).fontFamily === 'wristo-icon') (element as any).fontFamily = 'weather-font-0fe87f'
    }
  }
  const iconElements = getAmoledIconElements(config)
  const iconPendingStore = useAmoledIconAssetStore()
  for (const element of iconElements) {
    const item = element as any
    const pending = iconPendingStore.getPending(String(item.fontFamily || item.iconFont || ''), normalizeIconUnicode(item.amoledIconUnicode))
    if (pending) { item.amoledImageUrl = pending.objectUrl; item.imageUrl = pending.objectUrl }
  }

  const zip = new JSZip()
  const designUid = String((config as any).designId || 'design')
  const slug = slugifyDesignName(config.name, designUid || 'watchface')
  const manifest: DesignAssetManifest = {
    version: packageOptions.version || 2,
    selfContained: packageOptions.format === WRT_FORMAT ? true : undefined,
    format: packageOptions.format,
    generatedAt: new Date().toISOString(),
    designUid,
    designName: config.name,
    appId: options.appId || undefined,
    name: config.name || 'Wristo Watch Face',
    slug,
    category: 'watchface-kit',
    style: ['studio', 'connect-iq'],
    canvas: inferCanvas(config),
    palette: inferPalette(config),
    recommendedFields: inferRecommendedFields(config),
    assets: createAssetGroups(),
    design: {
      path: 'design.json',
    },
    elements: [],
    fonts: [],
    failures: [],
    icons: {
      amoled: [],
    },
    productImages: [],
    studio: {
      configPath: 'config/config.json',
      elementsPath: 'elements/',
      assetRefs: [],
    },
  }
  zip.file('design.json', JSON.stringify(config, null, 2))
  zip.file('config/config.json', JSON.stringify(config, null, 2))

  const usedPaths = new Set<string>()
  if (options.product === undefined && options.productImages === undefined) {
    manifest.productImages = JSON.parse(JSON.stringify(packageArchiveExtras.productImages))
    for (const product of manifest.productImages || []) {
      for (const variant of Object.values(product.variants)) {
        const blob = packageArchiveExtras.files.get(variant.path)
        if (!blob) throw new Error(`Missing preserved marketing image: ${variant.path}`)
        zip.file(variant.path, await blob.arrayBuffer())
        usedPaths.add(variant.path)
      }
    }
  }
  if (options.previewDataUrl === undefined && packageArchiveExtras.preview) {
    const preview = packageArchiveExtras.preview
    const blob = packageArchiveExtras.files.get(preview.path)
    if (!blob) throw new Error(`Missing preserved preview: ${preview.path}`)
    zip.file(preview.path, await blob.arrayBuffer())
    manifest.assets.preview = preview.path
    usedPaths.add(preview.path)
  }
  for (const [index, element] of (config.elements || []).entries()) {
    const id = getElementId(element, index)
    const type = getElementType(element)
    const path = `elements/${String(index + 1).padStart(3, '0')}-${sanitizePathSegment(type, 'element')}-${sanitizePathSegment(id, `element-${index + 1}`)}.json`
    zip.file(path, JSON.stringify(element, null, 2))
    manifest.elements?.push({ id, type, path })
  }
  const sourcePathByUrl = new Map<string, ManifestAsset>()
  const contentAssetByHash = new Map<string, ManifestAsset>()
  const elementRefs = (config.elements || []).flatMap((element, index) =>
    collectElementAssetRefs(element, index).map(ref => ({ ...ref, category: ref.elementType || 'element' })),
  )
  const themeRefs = collectVisualThemeAssetRefs(config.visualThemes)
  const configRefs = manifest.selfContained
    ? collectElementAssetRefs({ ...config, elements: undefined, visualThemes: undefined } as any, 0).map(ref => ({ ...ref, category: 'config' }))
    : []
  const marketingInputs = createMarketingAssetInputs(options.product || options.productImages)
  const fontSlugs = collectFontSlugs(config)
  const totalAssets = elementRefs.length + themeRefs.length + configRefs.length + marketingInputs.scalars.length
    + marketingInputs.gallery.length + fontSlugs.length + iconElements.length
    + (options.previewDataUrl ? 1 : 0)
  let completedAssets = 0
  const assetCompleted = () => {
    completedAssets += 1
    options.onProgress?.(totalAssets ? 80 * completedAssets / totalAssets : 80)
  }
  options.onProgress?.(0)
  for (const ref of [...elementRefs, ...themeRefs, ...configRefs]) {
    await addReferencedAssetToBundle(zip, manifest, sourcePathByUrl, contentAssetByHash, usedPaths, ref)
    assetCompleted()
  }

  for (const scalar of marketingInputs.scalars) {
    const record = await addScalarMarketingImage(zip, scalar)
    if (record) manifest.productImages?.push(record)
    assetCompleted()
  }
  for (const item of marketingInputs.gallery) {
    const imageId = Number(item.imageId ?? item.image?.id ?? item.id)
    if (!Number.isFinite(imageId) || imageId <= 0) {
      throw new Error(`Invalid product image id: ${String(item.imageId ?? item.id)}`)
    }
    const image = item.image || ({
      id: imageId,
      url: item.downloadUrl || item.imageUrl,
      previewUrl: item.previewUrl,
      name: `image-${imageId}`,
    } as Image)
    manifest.productImages?.push(await addGalleryMarketingImage(zip, {
      relationId: item.relationId ?? (item.imageId ? item.id : undefined),
      imageId,
      type: item.type || 'product',
      name: image.name,
      image,
    }))
    assetCompleted()
  }

  for (const slug of fontSlugs) {
    await addFontAssetToBundle(zip, manifest, usedPaths, slug)
    assetCompleted()
  }

  for (const element of iconElements) {
    const iconUnicode = normalizeIconUnicode((element as any).amoledIconUnicode)
    if (!iconUnicode) {
      assetCompleted()
      continue
    }
    const fontSlug = String((element as any).fontFamily || (element as any).iconFont || '').trim()
    const pending = fontSlug ? iconPendingStore.getPending(fontSlug, iconUnicode) : null
    const source = pending ? undefined : String((element as any).amoledImageUrl || (element as any).imageUrl || '').trim()
    if (!pending && !source) {
      if (manifest.selfContained) manifest.failures?.push({ category: 'icon', sourceUrl: iconUnicode, message: `Missing AMOLED icon asset: ${iconUnicode}` })
      assetCompleted()
      continue
    }
    try {
      await addAmoledIconAssetToBundle(zip, manifest, usedPaths, {
        iconUnicode,
        file: pending?.file,
        source,
        assetSource: pending ? 'custom' : 'design',
      })
    } catch (error: any) {
      manifest.failures?.push({
        category: 'icon',
        sourceUrl: iconUnicode,
        message: error?.message || String(error),
      })
    }
    assetCompleted()
  }

  if (options.previewDataUrl) {
    try {
      zip.file('preview.png', await (await fetchBlob(options.previewDataUrl)).arrayBuffer())
      manifest.assets.preview = 'preview.png'
    } catch (error: any) {
      manifest.failures?.push({
        category: 'preview',
        message: error?.message || String(error),
      })
    }
    assetCompleted()
  }
  if (!zip.file(manifest.assets.preview)) {
    const width = manifest.canvas?.width || 454
    const height = manifest.canvas?.height || 454
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${manifest.palette?.background || '#000000'}"/></svg>`
    zip.file('preview.svg', svg)
    manifest.assets.preview = 'preview.svg'
  }
  const previewEntry = zip.file(manifest.assets.preview)
  if (previewEntry) manifest.preview = { path: manifest.assets.preview, sha256: await sha256Hex(new Blob([await previewEntry.async('arraybuffer')])) }
  if (manifest.selfContained) {
    const bitmapIds = new Set<number>()
    const collectBitmapIds = (value: any): void => {
      if (!value || typeof value !== 'object') return
      if (Number(value.bitmapFontId) > 0) bitmapIds.add(Number(value.bitmapFontId))
      Object.values(value).forEach(collectBitmapIds)
    }
    collectBitmapIds(config)
    manifest.bitmapFonts = []
    for (const id of bitmapIds) {
      const chars = packageBitmapChars.get(id) || (await listBitmapFontChars(id)).data
      if (!chars?.length) throw new Error(`Missing bitmap characters: ${id}`)
      const entries = []
      for (const char of chars) {
        if (!char.image?.url) throw new Error(`Missing bitmap character image: ${id}/${char.charValue}`)
        const blob = await fetchBlob(char.image.url)
        const path = `fonts/bitmap-chars/${id}/${Array.from(char.charValue).map(c => c.codePointAt(0)!.toString(16)).join('-')}.${getFormatFromBlob(blob, char.image.url)}`
        zip.file(path, await blob.arrayBuffer())
        entries.push({ charValue: char.charValue, path, sha256: await sha256Hex(blob) })
      }
      manifest.bitmapFonts.push({ id, chars: entries })
    }
    for (const font of manifest.fonts || []) {
      for (const ref of collectElementAssetRefs(font.metadata as any, 0)) {
        await addReferencedAssetToBundle(zip, manifest, sourcePathByUrl, contentAssetByHash, usedPaths, { ...ref, category: 'font' })
      }
    }
    for (const entry of Object.values(zip.files)) {
      if (!entry.dir && entry.name.endsWith('.svg')) assertSelfContainedSvg(await entry.async('string'))
    }
    if (manifest.failures?.length) throw new Error(`Incomplete WRT: ${manifest.failures.map(f => f.message).join('; ')}`)
    const portable = JSON.parse(JSON.stringify(config))
    const rewrite = (value: any): void => {
      if (!value || typeof value !== 'object') return
      if (Object.values(value).some(child => typeof child === 'string' && sourcePathByUrl.has(child))) { delete value.assetId; delete value.imageId }
      for (const [key, child] of Object.entries(value)) {
        if (typeof child === 'string' && sourcePathByUrl.has(child)) value[key] = `bundle://${sourcePathByUrl.get(child)!.path}`
        else rewrite(child)
      }
    }
    rewrite(portable)
    for (const font of manifest.fonts || []) rewrite(font.metadata)
    zip.file('design.json', JSON.stringify(portable, null, 2))
    zip.file('config/config.json', JSON.stringify(portable, null, 2))
    for (const [index, element] of portable.elements.entries()) zip.file(manifest.elements![index].path, JSON.stringify(element, null, 2))
  }
  zip.file('README.md', createReadme(config, manifest))
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  let outputZip = zip
  let fileBaseName = slug
  if (packageOptions.rooted) {
    const root = options.appId ? `${options.appId}-${slug}` : `design-${sanitizePathSegment(designUid, 'design')}`
    const wrapped = new JSZip()
    wrapped.folder(root)
    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir) wrapped.folder(`${root}/${path}`)
      else wrapped.file(`${root}/${path}`, await entry.async('arraybuffer'))
    }
    outputZip = wrapped
    fileBaseName = root
  }
  options.onProgress?.(80)
  const blob = await outputZip.generateAsync(
    { type: 'blob', compression: 'DEFLATE' },
    ({ percent }) => options.onProgress?.(Math.min(99, 80 + percent * 0.19)),
  )
  const file = new File([blob], `${fileBaseName}${packageOptions.fileNameSuffix}`, { type: packageOptions.mimeType })
  options.onProgress?.(100)
  return file
}

export async function buildDesignAssetBundle(
  config: RuntimeDesignConfig,
  options: BuildDesignAssetBundleOptions = {},
): Promise<File | null> {
  return buildDesignAssetArchive(config, options, {
    fileNameSuffix: '-assets.zip',
    mimeType: 'application/zip',
    rooted: true,
  })
}

export async function buildWrtDesignPackage(
  config: RuntimeDesignConfig,
  options: BuildDesignAssetBundleOptions = {},
): Promise<File> {
  return buildDesignAssetArchive(config, options, {
    format: WRT_FORMAT,
    version: WRT_VERSION,
    fileNameSuffix: '.wrt',
    mimeType: 'application/vnd.wristo.design-package+zip',
  })
}

export async function restoreDesignAssetBundleFromZip(
  config: RuntimeDesignConfig,
  zip: JSZip,
  manifest: DesignAssetManifest | null,
): Promise<RuntimeDesignConfig> {
  const iconPendingStore = useAmoledIconAssetStore()
  iconPendingStore.clearAll()

  if (!config) return config

  const iconElements = getAmoledIconElements(config)

  try {
    const iconAssets = getBundleIconAssetEntries(zip, manifest)
    const assetRefs = manifest?.studio?.assetRefs || []


    const restoredAssetUrls = new Map<string, string>()
    for (const asset of assetRefs) {
      const sourceRef = asset.sourceRef || asset.sourceUrl
      if (!sourceRef || !asset.path || restoredAssetUrls.has(sourceRef)) continue
      try {
        const fileEntry = zip.file(asset.path)
        if (!fileEntry) continue
        const archiveBlob = await fileEntry.async('blob')
        const blob = new Blob([archiveBlob], { type: asset.mimeType || getBundleAssetMimeType(asset.path) })
        const objectUrl = URL.createObjectURL(blob)
        restoredDesignAssetUrls.add(objectUrl)
        restoredAssetUrls.set(sourceRef, objectUrl)
        restoredAssetUrls.set(`bundle://${asset.path}`, objectUrl)
      } catch (error) {
        if (manifest?.version === 2 && manifest.format === WRT_FORMAT) throw error
        console.warn('[designAssetBundle] Failed to restore referenced asset', error)
      }
    }
    const restoreElementAssetUrls = (value: unknown): void => {
      if (!value || typeof value !== 'object') return
      if (Array.isArray(value)) {
        value.forEach(restoreElementAssetUrls)
        return
      }
      Object.entries(value as Record<string, unknown>).forEach(([key, childValue]) => {
        if (typeof childValue === 'string') {
          const restoredUrl = restoredAssetUrls.get(childValue)
          if (restoredUrl) (value as Record<string, unknown>)[key] = restoredUrl
          return
        }
        restoreElementAssetUrls(childValue)
      })
    }
    restoreElementAssetUrls(config)
    for (const font of manifest?.fonts || []) {
      let ttfFile
      if (font.path && zip.file(font.path)) {
        const blob = new Blob([await zip.file(font.path)!.async('arraybuffer')], { type: font.mimeType || 'font/ttf' })
        const url = URL.createObjectURL(blob)
        restoredDesignAssetUrls.add(url)
        ttfFile = { url }
      }
      const metadata = { ...font.metadata, slug: font.slug, ttfFile }
      restoreElementAssetUrls(metadata)
      packageFonts.set(canonicalFontSlug(font.slug), metadata as any)
      if (font.buildPath) {
        const files = new Map<string, Blob>()
        for (const entry of font.buildFiles || []) files.set(entry.path.slice(font.buildPath.length + 1), new Blob([await zip.file(entry.path)!.async('arraybuffer')]))
        packageFontBuildFiles.set(font.slug, files)
      }
    }

    for (const font of manifest?.bitmapFonts || []) {
      const chars = []
      for (const char of font.chars) {
        const blob = new Blob([await zip.file(char.path)!.async('arraybuffer')], { type: getBundleAssetMimeType(char.path) })
        const url = URL.createObjectURL(blob)
        restoredDesignAssetUrls.add(url)
        chars.push({ fontId: font.id, charValue: char.charValue, image: { url } } as any)
      }
      packageBitmapChars.set(font.id, chars)
    }
    packageArchiveExtras.productImages = JSON.parse(JSON.stringify(manifest?.productImages || []))
    packageArchiveExtras.files.clear()
    packageArchiveExtras.preview = undefined
    for (const product of packageArchiveExtras.productImages) {
      for (const variant of Object.values(product.variants)) {
        const entry = zip.file(variant.path)
        if (entry) packageArchiveExtras.files.set(variant.path, new Blob([await entry.async('arraybuffer')], { type: variant.mimeType }))
      }
    }
    const previewPath = manifest?.preview?.path || manifest?.assets?.preview
    const previewEntry = previewPath && zip.file(previewPath)
    if (previewEntry) {
      const blob = new Blob([await previewEntry.async('arraybuffer')], { type: getBundleAssetMimeType(previewPath) })
      packageArchiveExtras.files.set(previewPath, blob)
      packageArchiveExtras.preview = { path: previewPath, sha256: await sha256Hex(blob) }
    }
    const iconFontSlugs = Array.from(new Set([
      ...iconElements
        .map((element: any) => String(element.fontFamily || element.iconFont || '').trim())
        .filter(Boolean),
    ].filter(Boolean)))
    const restoredIconUrlByFontAndUnicode = new Map<string, string>()
    if (iconFontSlugs.length && !(manifest?.format === WRT_FORMAT && manifest.version === 2)) {
      for (const asset of iconAssets) {
        const iconUnicode = normalizeIconUnicode(asset.iconUnicode)
        if (!iconUnicode || !asset.path) continue
        const fileEntry = zip.file(asset.path)
        if (!fileEntry) continue
        const blob = await fileEntry.async('blob')
        const fileName = `${iconUnicode}.${asset.format || (getMimeTypeForBundlePath(asset.path) === 'image/png' ? 'png' : 'svg')}`
        for (const fontSlug of iconFontSlugs) {
          iconPendingStore.upsertPending({
            fontSlug,
            iconUnicode,
            file: new File([blob], fileName, { type: getMimeTypeForBundlePath(asset.path) }),
          })
          const pending = iconPendingStore.getPending(fontSlug, iconUnicode)
          if (pending?.objectUrl) {
            restoredIconUrlByFontAndUnicode.set(`${fontSlug}::${iconUnicode}`, pending.objectUrl)
          }
        }
      }
    }

    for (const element of iconElements) {
      const fontSlug = String((element as any).fontFamily || (element as any).iconFont || '').trim()
      const iconUnicode = normalizeIconUnicode((element as any).amoledIconUnicode)
      if (!fontSlug || !iconUnicode) continue

      const objectUrl = restoredIconUrlByFontAndUnicode.get(`${fontSlug}::${iconUnicode}`)
      if (objectUrl) {
        const mutableElement = element as AnyElementConfig & {
          amoledImageUrl?: string
          imageUrl?: string
        }
        mutableElement.amoledImageUrl = objectUrl
        mutableElement.imageUrl = objectUrl
      }
    }
  } catch (error) {
    if (manifest?.version === 2 && manifest.format === WRT_FORMAT) throw error
    console.warn('[designAssetBundle] Failed to restore design asset bundle', error)
  }

  return config
}

export async function restoreDesignAssetBundle(
  config: RuntimeDesignConfig,
  options: RestoreBundleOptions,
): Promise<RuntimeDesignConfig> {
  const assetBundleUrl = String(options.assetBundleUrl || '').trim()
  if (!assetBundleUrl) return config

  const response = await fetch(toAbsoluteUrl(assetBundleUrl))
  if (!response.ok) throw new Error(`Failed to fetch design asset bundle: ${assetBundleUrl}`)
  const bytes = await response.arrayBuffer()
  const zip = await JSZip.loadAsync(bytes)
  const manifest = await parseManifest(zip)
  if (manifest?.format === WRT_FORMAT && manifest.version === 2) {
    const imported = await readWrtDesignPackage(new File([bytes], 'project.wrt'))
    return options.preserveConfig ? restoreDesignAssetBundleFromZip(config, zip, manifest) : imported.config
  }
  clearRestoredDesignAssetUrls()
  return restoreDesignAssetBundleFromZip(config, zip, manifest)
}

export async function readWrtDesignPackage(file: File): Promise<ImportedWrtDesignPackage> {
  if (!file || !/\.wrt$/i.test(file.name || '')) {
    throw new WrtDesignPackageError('invalid-file', 'Expected a .wrt design package file')
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer())
  } catch (error) {
    throw new WrtDesignPackageError('invalid-archive', 'Unable to read .wrt archive')
  }

  const manifest = await parseManifest(zip)
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new WrtDesignPackageError('invalid-manifest', 'Missing or invalid manifest.json')
  }
  if (!manifest.design || typeof manifest.design !== 'object' || Array.isArray(manifest.design)) {
    throw new WrtDesignPackageError('invalid-manifest', 'Manifest is missing a valid design entry')
  }
  if (typeof manifest.design.path !== 'string' || !manifest.design.path.trim()) {
    throw new WrtDesignPackageError('invalid-manifest', 'Manifest is missing design.path')
  }
  if (manifest.format !== WRT_FORMAT) {
    throw new WrtDesignPackageError('invalid-manifest', 'Unsupported .wrt package format')
  }
  if (manifest.version !== 1 && manifest.version !== WRT_VERSION) {
    throw new WrtDesignPackageError('unsupported-version', 'Unsupported .wrt package version')
  }

  const designFile = zip.file(manifest.design.path.trim())
  if (!designFile) {
    throw new WrtDesignPackageError('invalid-design', 'Design configuration is missing from the archive')
  }

  let config: RuntimeDesignConfig
  try {
    config = JSON.parse(await designFile.async('string')) as RuntimeDesignConfig
  } catch (error) {
    throw new WrtDesignPackageError('invalid-design', 'Unable to parse design configuration')
  }
  if (!Array.isArray(config?.elements)) {
    throw new WrtDesignPackageError('invalid-design', 'Design configuration must contain an elements array')
  }

  if (manifest.version === 2) {
    if (!manifest.selfContained || manifest.failures?.length) throw new WrtDesignPackageError('invalid-manifest', 'WRT v2 must be complete and self-contained')
    for (const asset of [...(manifest.studio?.assetRefs || []), ...(manifest.fonts || []).filter(font => font.path), ...(manifest.fonts || []).flatMap(font => font.buildFiles || []), ...(manifest.bitmapFonts || []).flatMap(font => font.chars), ...(manifest.icons?.amoled || []), ...(manifest.preview ? [manifest.preview] : []), ...(manifest.productImages || []).flatMap(image => Object.values(image.variants || {}))]) {
      const entry = asset.path && zip.file(asset.path)
      if (entry && asset.path?.endsWith('.svg')) assertSelfContainedSvg(await entry.async('string'))
      if (!entry || !asset.sha256 || asset.sha256 !== await sha256Hex(new Blob([await entry.async('arraybuffer')]))) {
        throw new WrtDesignPackageError('invalid-manifest', `Missing or corrupt package asset: ${asset.path}`)
      }
    }
    const verifiedRefs = new Set((manifest.studio?.assetRefs || []).map(asset => `bundle://${asset.path}`))
    const check = (value: unknown): void => {
      if (!value || typeof value !== 'object') return
      for (const [key, child] of Object.entries(value)) {
        if (typeof child === 'string' && ASSET_URL_FIELDS.has(key) && child && (!child.startsWith('bundle://') || !verifiedRefs.has(child))) throw new WrtDesignPackageError('invalid-design', `Unresolved package asset: ${key}`)
        else check(child)
      }
    }
    check(config)
    for (const font of manifest.fonts || []) {
      check(font.metadata)
      if (!font.path && (!font.metadata?.bitmapPreviewAtlasUrl || !font.metadata?.bitmapPreviewDescriptorUrl)) throw new WrtDesignPackageError('invalid-manifest', `Missing font preview assets: ${font.slug}`)
      if (!font.slug.startsWith('local-') && !font.buildFiles?.some(file => file.path.endsWith('.fnt'))) throw new WrtDesignPackageError('invalid-manifest', `Missing font build assets: ${font.slug}`)
    }
    for (const slug of collectFontSlugs(config)) if (!manifest.fonts?.some(font => font.slug === slug && (font.path || font.buildFiles?.length))) throw new WrtDesignPackageError('invalid-manifest', `Missing packaged font: ${slug}`)
  }
  clearRestoredDesignAssetUrls()
  packageFonts.clear()
  packageFontBuildFiles.clear()
  packageBitmapChars.clear()
  const restoredConfig = await restoreDesignAssetBundleFromZip(config, zip, manifest)
  return {
    config: restoredConfig,
    sourceName: manifest.designName || config.name || 'Watch Face',
    failures: manifest.failures || [],
  }
}
