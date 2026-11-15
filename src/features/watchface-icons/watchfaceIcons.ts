import { WEATHER_ICON_CODES, normalizeWeatherIconCode } from '@/elements/weather/weather/weatherCodes'
import type { WatchfaceIconAsset } from '@/types/watchfaceIcons'
import type { DataTypeOption } from '@/types/dataCatalog'
import type { ElementConfigSnapshot } from '@/stores/elementDataStore'
import { getAmoledIconCandidateFromElement } from '@/utils/amoledIconCandidates'
import { normalizeIconUnicode } from '@/types/amoledIcons'

export interface WatchfaceIcon {
  custom?: boolean
  imageUrl?: string
  key: string
  fontSlug: string
  unicode: string
  label: string
  elements: ElementConfigSnapshot[]
}

export function collectWatchfaceIcons(elements: ElementConfigSnapshot[]): WatchfaceIcon[] {
  const groups = new Map<string, WatchfaceIcon>()
  for (const element of elements) {
    if (!['icon', 'weather'].includes(element.eleType)) continue
    const config = element.config as any
    let candidate
    try {
      candidate = element.eleType === 'weather' ? null : getAmoledIconCandidateFromElement(config)
    } catch {
      /* Keep imported icons visible even without a catalog match. */
    }
    const unicode = element.eleType === 'weather' ? normalizeWeatherIconCode(config.iconUnicode) : candidate?.iconUnicode || normalizeIconUnicode(config.amoledIconUnicode || config.iconUnicode || config.text)
    const fontSlug = String(config.fontFamily || config.iconFont || 'wristo-icon').trim()
    const key = config.customIconId || `${fontSlug}::${unicode || element.id}`
    let group = groups.get(key)
    if (!group) {
      group = { key, custom: Boolean(config.customIconId), fontSlug, unicode, label: candidate?.label || config.layerName || unicode || 'Icon', elements: [] }
      groups.set(key, group)
    }
    group.elements.push(element)
  }
  return [...groups.values()]
}

/** Merge the catalog, saved unused assets and references from every display state. */
export function collectAvailableIcons(elements: ElementConfigSnapshot[], options: readonly DataTypeOption[], assets: WatchfaceIconAsset[], fontSlug: string, locale: string): WatchfaceIcon[] {
  const groups = new Map<string, WatchfaceIcon>()
  const fonts = new Set([fontSlug, ...elements.filter((e) => e.eleType === 'icon').map((e) => String((e.config as any).fontFamily || (e.config as any).iconFont || fontSlug))])
  for (const font of fonts)
    for (const option of options) {
      const unicode = normalizeIconUnicode(option.iconUnicode)
      if (!unicode) continue
      const key = `${font}::${unicode}`
      const label = `${locale.startsWith('zh') ? option.settingsLabel.zhs : option.settingsLabel.eng} (${option.metricSymbol})`
      const existing = groups.get(key)
      if (existing) existing.label += ` / ${label}`
      else groups.set(key, { key, fontSlug: font, unicode, label, elements: [] })
    }
  const weatherFonts = new Set(elements.filter(e => e.eleType === 'weather').map(e => String((e.config as any).fontFamily || '')))
  for (const font of weatherFonts) {
    if (!font) continue
    for (const unicode of WEATHER_ICON_CODES) {
      const key = `${font}::${unicode}`
      groups.set(key, { key, fontSlug: font, unicode, label: `${locale.startsWith('zh') ? '天气' : 'Weather'} ${unicode}`, elements: [] })
    }
  }
  for (const item of collectWatchfaceIcons(elements)) {
    const catalog = groups.get(item.key)
    groups.set(item.key, { ...item, label: catalog?.label || item.label })
  }
  for (const asset of assets) {
    const existing = groups.get(asset.id)
    groups.set(asset.id, {
      key: asset.id,
      fontSlug: asset.fontSlug || existing?.fontSlug || fontSlug,
      unicode: asset.unicode || existing?.unicode || '',
      label: existing && asset.kind === 'override' ? existing.label : asset.name,
      custom: asset.kind === 'custom',
      imageUrl: asset.imageUrl,
      elements: existing?.elements || []
    })
  }
  return [...groups.values()]
}

export function iconImagePatch(config: Record<string, any>, unicode: string, source: string) {
  if (config.eleType === 'weather') return { amoledImageUrl: source }
  if (!source) return { iconDisplayType: 'mip', amoledImageUrl: '', imageUrl: '', amoledIconUnicode: unicode, text: unicode }
  const size = Number(config.iconSize || config.fontSize || 24)
  return { iconDisplayType: 'amoled', amoledImageUrl: source, imageUrl: source, amoledIconUnicode: unicode, iconSize: size, fontSize: size, width: size, height: size }
}

export async function readIconImage(file: File): Promise<string> {
  if (!/\.(png|svg)$/i.test(file.name) || (file.type && !['image/png', 'image/svg+xml'].includes(file.type))) {
    throw new Error('PNG / SVG only')
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('Maximum 5 MB')
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Cannot read image'))
    reader.readAsDataURL(file)
  })
  await new Promise<void>((resolve, reject) => {
    const image = new Image()
    image.onload = () => (image.naturalWidth > 0 && image.naturalHeight > 0 ? resolve() : reject(new Error('Invalid image')))
    image.onerror = () => reject(new Error('Invalid image'))
    image.src = source
  })
  return source
}

/** Resolve a saved replacement for a default glyph; an empty URL means explicit removal. */
export function resolveWatchfaceIconImage(config: Record<string, any>, assets: readonly WatchfaceIconAsset[], unicode: string) {
  if (config.amoledImageUrl === '') return {}
  const font = String(config.fontFamily || config.iconFont || 'wristo-icon').trim()
  const asset = assets.find(item => item.id === (config.customIconId || `${font}::${normalizeIconUnicode(unicode)}`))
  const storedUnicode = normalizeIconUnicode(config.amoledIconUnicode)
  const ownImage = !storedUnicode || storedUnicode === normalizeIconUnicode(unicode) || config.customIconId
    ? config.amoledImageUrl || config.imageUrl : ''
  const image = asset?.imageUrl || ownImage
  return image ? iconImagePatch(config, unicode, image) : {}
}
