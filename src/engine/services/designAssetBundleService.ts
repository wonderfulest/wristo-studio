import JSZip from 'jszip'
import type { RuntimeDesignConfig } from '@/types/app/config'
import type { AnyElementConfig } from '@/types/elements'
import { getWeatherConditions } from '@/api/wristo/weather'
import type { WeatherConditionAssetsVO } from '@/types/api/weather'
import { useWeatherAmoledIconStore, type PendingWeatherAmoledIcon } from '@/stores/weatherAmoledIconStore'
import { getFontBySlug } from '@/api/wristo/fonts'
import { useAmoledIconAssetStore } from '@/stores/amoledIconAssetStore'
import { normalizeIconUnicode } from '@/types/amoledIcons'

type ManifestWeatherAsset = {
  condition: string
  iconUnicode: string
  path: string
  format: string
  sourceUrl?: string
}

type ManifestIconAsset = {
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
  weather: string[]
}

type ManifestAsset = {
  id: string
  category: string
  path: string
  format: string
  mimeType?: string
  sourceUrl?: string
  elementId?: string
  elementType?: string
  field?: string
}

type ManifestFontAsset = {
  slug: string
  path?: string
  format?: string
  mimeType?: string
  sourceUrl?: string
  metadata?: Record<string, unknown>
}

type ManifestFailure = {
  category: string
  sourceUrl?: string
  elementId?: string
  field?: string
  message: string
}

type DesignAssetManifest = {
  version: 1 | 2
  generatedAt: string
  designUid: string
  designName?: string
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
  failures?: ManifestFailure[]
  weather: {
    amoled: ManifestWeatherAsset[]
  }
  icons?: {
    amoled: ManifestIconAsset[]
  }
  studio?: {
    configPath: string
    elementsPath: string
    assetRefs: ManifestAsset[]
  }
}

type BuildDesignAssetBundleOptions = {
  previewDataUrl?: string | null
}

type RestoreBundleOptions = {
  assetBundleUrl?: string | null
}

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value)
const isDataUrl = (value: string): boolean => /^data:/i.test(value)
const isBlobUrl = (value: string): boolean => /^blob:/i.test(value)

const ASSET_URL_FIELDS = new Set([
  'imageUrl',
  'amoledImageUrl',
  'weatherImageUrl',
  'moonImageUrl',
  'wristoImageUrl',
  'previewUrl',
  'svgFile',
  'fileUrl',
  'src',
])

const FONT_FIELDS = new Set(['fontFamily'])

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

const getAmoledWeatherElements = (config: RuntimeDesignConfig): AnyElementConfig[] => {
  return (config.elements || []).filter((element: any) => {
    return element?.eleType === 'weather' && (element.weatherDisplayType || 'amoled') === 'amoled'
  })
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
  weather: [],
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
  if (combined.includes('hand')) return 'hands'
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
        refs.push({ elementId, elementType, field: key, source })
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

const collectFontSlugs = (config: RuntimeDesignConfig): string[] => {
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
    Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
      walk(childValue, childKey)
    })
  }

  walk(config)
  return Array.from(slugs)
}

const getBundleAssetEntries = (zip: JSZip, manifest: DesignAssetManifest | null): ManifestWeatherAsset[] => {
  if (manifest?.weather?.amoled?.length) {
    return manifest.weather.amoled.filter((item) => item?.path && item?.iconUnicode)
  }

  return Object.keys(zip.files)
    .filter((path) => /^weather\/amoled\/[^/]+\.(svg|png)$/i.test(path) && !zip.files[path].dir)
    .map((path) => {
      const iconUnicode = getIconUnicodeFromPath(path)
      const format = /\.png$/i.test(path) ? 'png' : 'svg'
      return {
        condition: iconUnicode,
        iconUnicode,
        path,
        format,
      }
    })
    .filter((item) => item.iconUnicode)
}

const getBundleIconAssetEntries = (zip: JSZip, manifest: DesignAssetManifest | null): ManifestIconAsset[] => {
  if (manifest?.icons?.amoled?.length) {
    return manifest.icons.amoled.filter((item) => item?.iconUnicode)
  }

  return Object.keys(zip.files)
    .filter((path) => /^icons\/amoled\/[^/]+\.(svg|png)$/i.test(path) && !zip.files[path].dir)
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

const pickWeatherAssetSource = (item: WeatherConditionAssetsVO): string => {
  const asset = item.asset
  if (!asset) return ''
  if (asset.svgContent?.trim()) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svgContent.trim())}`
  }
  return asset.svgFile || asset.imageUrl || asset.previewUrl || ''
}

const getFileFormat = (file?: File): 'svg' | 'png' => {
  if (!file) return 'svg'
  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  return type === 'image/png' || name.endsWith('.png') ? 'png' : 'svg'
}

const getWeatherAssetFormat = (item: WeatherConditionAssetsVO): 'svg' | 'png' => {
  const asset = item.asset
  if (!asset) return 'svg'
  if (asset.svgContent?.trim()) return 'svg'
  const format = String(asset.format || '').toLowerCase()
  const source = String(asset.imageUrl || asset.previewUrl || asset.svgFile || '').toLowerCase()
  return format === 'png' || /\.png(?:$|\?)/i.test(source) ? 'png' : 'svg'
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

const addReferencedAssetToBundle = async (
  zip: JSZip,
  manifest: DesignAssetManifest,
  sourcePathByUrl: Map<string, ManifestAsset>,
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
    manifest.studio?.assetRefs.push({
      ...existing,
      id: `${existing.id}-ref-${manifest.studio?.assetRefs.length || 0}`,
      elementId: input.elementId,
      elementType: input.elementType,
      field: input.field,
    })
    return
  }

  try {
    const blob = await fetchBlob(source)
    const format = getFormatFromBlob(blob, source)
    const elementPart = sanitizePathSegment(input.elementId || input.category, input.category)
    const fieldPart = sanitizePathSegment(input.field || 'asset', 'asset')
    let path = `assets/${sanitizePathSegment(input.category, 'asset')}/${elementPart}-${fieldPart}.${format}`
    let suffix = 1
    while (usedPaths.has(path)) {
      suffix += 1
      path = `assets/${sanitizePathSegment(input.category, 'asset')}/${elementPart}-${fieldPart}-${suffix}.${format}`
    }
    usedPaths.add(path)
    zip.file(path, blob)

    const asset: ManifestAsset = {
      id: `asset-${sourcePathByUrl.size + 1}`,
      category: input.category,
      path,
      format,
      mimeType: blob.type || getMimeTypeForFormat(format),
      sourceUrl: isDataUrl(source) || isBlobUrl(source) ? undefined : source,
      elementId: input.elementId,
      elementType: input.elementType,
      field: input.field,
    }
    sourcePathByUrl.set(source, asset)
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
    const response = await getFontBySlug(slug)
    const font = response.data
    const source = font?.ttfFile?.url
    if (!font || !source) {
      manifest.fonts?.push({ slug, metadata: font ? { ...font, ttfFile: undefined } as any : undefined })
      return
    }

    const blob = await fetchBlob(source)
    const format = getFormatFromBlob(blob, source, 'ttf')
    const safeSlug = sanitizePathSegment(slug, 'font')
    let path = `fonts/${safeSlug}.${format}`
    let suffix = 1
    while (usedPaths.has(path)) {
      suffix += 1
      path = `fonts/${safeSlug}-${suffix}.${format}`
    }
    usedPaths.add(path)
    zip.file(path, blob)
    pushAssetGroupPath(manifest.assets, 'fonts', path)
    manifest.fonts?.push({
      slug,
      path,
      format,
      mimeType: blob.type || getMimeTypeForFormat(format),
      sourceUrl: source,
      metadata: {
        id: font.id,
        fullName: font.fullName,
        postscriptName: font.postscriptName,
        family: font.family,
        subfamily: font.subfamily,
        language: font.language,
        type: font.type,
        weight: font.weight,
        glyphCount: font.glyphCount,
        isSystem: font.isSystem,
        status: font.status,
      },
    })
  } catch (error: any) {
    manifest.failures?.push({
      category: 'font',
      sourceUrl: slug,
      message: error?.message || String(error),
    })
  }
}

const addWeatherAssetToBundle = async (
  zip: JSZip,
  manifest: DesignAssetManifest,
  usedPaths: Set<string>,
  input: {
    condition: string
    iconUnicode: string
    source?: string
    file?: File
    format?: 'svg' | 'png'
  },
) => {
  const iconUnicode = String(input.iconUnicode || '').trim()
  if (!iconUnicode) return

  const format = input.format || getFileFormat(input.file)
  const path = `weather/amoled/${iconUnicode}.${format}`
  if (usedPaths.has(path)) return
  usedPaths.add(path)

  if (input.file) {
    zip.file(path, input.file)
  } else if (input.source) {
    zip.file(path, await fetchBlob(input.source))
  } else {
    return
  }

  manifest.weather.amoled.push({
    condition: String(input.condition || iconUnicode),
    iconUnicode,
    path,
    format,
    sourceUrl: input.source && !isDataUrl(input.source) ? input.source : undefined,
  })
  pushAssetGroupPath(manifest.assets, 'weather', path)
  pushAssetGroupPath(manifest.assets, 'icons', path)
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
    const path = `icons/amoled/${iconUnicode}.${format}`
    if (!usedPaths.has(path)) {
      usedPaths.add(path)
      if (input.file) {
        zip.file(path, input.file)
      } else if (input.source) {
        zip.file(path, await fetchBlob(input.source))
      }
      entry.path = path
      entry.format = format
      entry.sourceUrl = input.source && !isDataUrl(input.source) ? input.source : undefined
      pushAssetGroupPath(manifest.assets, 'icons', path)
    }
  }

  manifest.icons?.amoled.push(entry)
}

export async function buildDesignAssetBundle(
  config: RuntimeDesignConfig,
  options: BuildDesignAssetBundleOptions = {},
): Promise<File | null> {
  const weatherElements = getAmoledWeatherElements(config)
  const iconElements = getAmoledIconElements(config)
  const pendingStore = useWeatherAmoledIconStore()
  const iconPendingStore = useAmoledIconAssetStore()

  const zip = new JSZip()
  const designUid = String((config as any).designId || 'design')
  const slug = slugifyDesignName(config.name, designUid || 'watchface')
  const manifest: DesignAssetManifest = {
    version: 2,
    generatedAt: new Date().toISOString(),
    designUid,
    designName: config.name,
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
    weather: {
      amoled: [],
    },
    icons: {
      amoled: [],
    },
    studio: {
      configPath: 'config/config.json',
      elementsPath: 'elements/',
      assetRefs: [],
    },
  }
  zip.file('design.json', JSON.stringify(config, null, 2))
  zip.file('config/config.json', JSON.stringify(config, null, 2))

  const weatherFontSlugs = Array.from(new Set(
    weatherElements
      .map((element: any) => String(element.fontFamily || '').trim())
      .filter(Boolean),
  ))

  const usedPaths = new Set<string>()
  for (const [index, element] of (config.elements || []).entries()) {
    const id = getElementId(element, index)
    const type = getElementType(element)
    const path = `elements/${String(index + 1).padStart(3, '0')}-${sanitizePathSegment(type, 'element')}-${sanitizePathSegment(id, `element-${index + 1}`)}.json`
    zip.file(path, JSON.stringify(element, null, 2))
    manifest.elements?.push({ id, type, path })
  }

  const sourcePathByUrl = new Map<string, ManifestAsset>()
  for (const [index, element] of (config.elements || []).entries()) {
    const refs = collectElementAssetRefs(element, index)
    for (const ref of refs) {
      await addReferencedAssetToBundle(zip, manifest, sourcePathByUrl, usedPaths, {
        category: ref.elementType || 'element',
        elementId: ref.elementId,
        elementType: ref.elementType,
        field: ref.field,
        source: ref.source,
      })
    }
  }

  for (const slug of collectFontSlugs(config)) {
    await addFontAssetToBundle(zip, manifest, usedPaths, slug)
  }

  const pendingByFontAndUnicode = new Map<string, PendingWeatherAmoledIcon>()
  pendingStore.listByFontSlugs(weatherFontSlugs).forEach((item) => {
    pendingByFontAndUnicode.set(`${item.fontSlug}::${item.iconUnicode}`, item)
  })

  for (const fontSlug of weatherFontSlugs) {
    let response
    try {
      response = await getWeatherConditions(fontSlug, 'amoled')
    } catch (error: any) {
      manifest.failures?.push({
        category: 'weather',
        sourceUrl: fontSlug,
        message: error?.message || String(error),
      })
      continue
    }
    for (const item of response.data || []) {
      const iconUnicode = String(item.iconUnicode || item.condition || '').trim()
      if (!iconUnicode) continue
      const pending = pendingByFontAndUnicode.get(`${fontSlug}::${iconUnicode}`)
      if (pending) {
        try {
          await addWeatherAssetToBundle(zip, manifest, usedPaths, {
            condition: pending.condition || String(item.condition || iconUnicode),
            iconUnicode,
            file: pending.file,
          })
        } catch (error: any) {
          manifest.failures?.push({
            category: 'weather',
            sourceUrl: iconUnicode,
            message: error?.message || String(error),
          })
        }
        continue
      }

      const source = pickWeatherAssetSource(item)
      if (!source) continue
      try {
        await addWeatherAssetToBundle(zip, manifest, usedPaths, {
          condition: String(item.condition || iconUnicode),
          iconUnicode,
          source,
          format: getWeatherAssetFormat(item),
        })
      } catch (error: any) {
        manifest.failures?.push({
          category: 'weather',
          sourceUrl: isDataUrl(source) || isBlobUrl(source) ? undefined : source,
          message: error?.message || String(error),
        })
      }
    }
  }

  for (const pending of pendingByFontAndUnicode.values()) {
    try {
      await addWeatherAssetToBundle(zip, manifest, usedPaths, {
        condition: pending.condition,
        iconUnicode: pending.iconUnicode,
        file: pending.file,
      })
    } catch (error: any) {
      manifest.failures?.push({
        category: 'weather',
        sourceUrl: pending.iconUnicode,
        message: error?.message || String(error),
      })
    }
  }

  for (const element of iconElements) {
    const iconUnicode = normalizeIconUnicode((element as any).amoledIconUnicode)
    if (!iconUnicode) continue
    const fontSlug = String((element as any).fontFamily || (element as any).iconFont || '').trim()
    const pending = fontSlug ? iconPendingStore.getPending(fontSlug, iconUnicode) : null
    const source = pending ? undefined : String((element as any).amoledImageUrl || (element as any).imageUrl || '').trim()
    if (!pending && !source) continue
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
  }

  if (options.previewDataUrl) {
    try {
      zip.file('preview.png', await fetchBlob(options.previewDataUrl))
    } catch (error: any) {
      manifest.failures?.push({
        category: 'preview',
        message: error?.message || String(error),
      })
    }
  }
  if (!zip.file('preview.png')) {
    const width = manifest.canvas?.width || 454
    const height = manifest.canvas?.height || 454
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${manifest.palette?.background || '#000000'}"/></svg>`
    zip.file('preview.svg', svg)
    manifest.assets.preview = 'preview.svg'
  }
  zip.file('README.md', createReadme(config, manifest))
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  return new File([blob], `${slug}-assets.zip`, { type: 'application/zip' })
}

export async function restoreDesignAssetBundle(
  config: RuntimeDesignConfig,
  options: RestoreBundleOptions,
): Promise<RuntimeDesignConfig> {
  const pendingStore = useWeatherAmoledIconStore()
  const iconPendingStore = useAmoledIconAssetStore()
  pendingStore.clearAll()
  iconPendingStore.clearAll()

  if (!config?.elements?.length) return config

  const weatherElements = getAmoledWeatherElements(config)
  const iconElements = getAmoledIconElements(config)

  const assetBundleUrl = String(options.assetBundleUrl || '').trim()
  if (!assetBundleUrl) return config

  try {
    const response = await fetch(toAbsoluteUrl(assetBundleUrl))
    if (!response.ok) {
      throw new Error(`Failed to fetch design asset bundle: ${assetBundleUrl}`)
    }

    const zip = await JSZip.loadAsync(await response.blob())
    const manifest = await parseManifest(zip)
    const assets = getBundleAssetEntries(zip, manifest)
    const iconAssets = getBundleIconAssetEntries(zip, manifest)
    if (!assets.length && !iconAssets.length) return config

    const weatherFontSlugs = Array.from(new Set(
      weatherElements
        .map((element: any) => String(element.fontFamily || '').trim())
        .filter(Boolean),
    ))
    const restoredUrlByFontAndUnicode = new Map<string, string>()

    for (const asset of assets) {
      const iconUnicode = String(asset.iconUnicode || '').trim()
      if (!iconUnicode) continue

      const fileEntry = zip.file(asset.path)
      if (!fileEntry) continue

      const blob = await fileEntry.async('blob')
      const fileName = `${iconUnicode}.${asset.format || (getMimeTypeForBundlePath(asset.path) === 'image/png' ? 'png' : 'svg')}`
      const file = new File([blob], fileName, { type: getMimeTypeForBundlePath(asset.path) })

      for (const fontSlug of weatherFontSlugs) {
        if (!fontSlug) continue

        pendingStore.upsertPending({
          fontSlug,
          iconUnicode,
          condition: asset.condition || iconUnicode,
          file,
        })

        const pending = pendingStore.getPending(fontSlug, iconUnicode)
        if (pending?.objectUrl) {
          restoredUrlByFontAndUnicode.set(`${fontSlug}::${iconUnicode}`, pending.objectUrl)
        }
      }
    }

    const iconFontSlugs = Array.from(new Set([
      ...iconElements
        .map((element: any) => String(element.fontFamily || element.iconFont || '').trim())
        .filter(Boolean),
    ].filter(Boolean)))
    const restoredIconUrlByFontAndUnicode = new Map<string, string>()
    if (iconFontSlugs.length) {
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

    for (const element of weatherElements) {
      const fontSlug = String((element as any).fontFamily || '').trim()
      const iconUnicode = String((element as any).amoledIconUnicode || '').trim()
      if (!fontSlug || !iconUnicode) continue

      const objectUrl = restoredUrlByFontAndUnicode.get(`${fontSlug}::${iconUnicode}`)
      if (objectUrl) {
        const mutableElement = element as AnyElementConfig & {
          amoledImageUrl?: string
          imageUrl?: string
        }
        mutableElement.amoledImageUrl = objectUrl
        mutableElement.imageUrl = objectUrl
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
    console.warn('[designAssetBundle] Failed to restore design asset bundle', error)
  }

  return config
}
