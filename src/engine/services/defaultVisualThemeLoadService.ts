import {
  VISUAL_THEME_ASSET_BASE_FIELDS,
  VISUAL_THEME_ASSET_ELEMENT_TYPES,
  VISUAL_THEME_COLOR_BINDINGS,
} from './visualThemeElementFields'
import type { RuntimeDesignConfig } from '@/types/app/config'
import type { AnyElementConfig } from '@/types/elements'
import type { VisualThemeAssetRef, VisualThemeAssetSlot } from '@/types/visualTheme'

const clone = <T>(value: T): T => structuredClone(value)
const toCanvasColor = (color: string): string =>
  /^0x[0-9a-f]{6}$/i.test(color) ? `#${color.slice(2)}` : color

export function restoreVisualThemeBaseFieldsForPersistence(
  displayElements: AnyElementConfig[],
  baseElements: AnyElementConfig[],
): AnyElementConfig[] {
  const baseById = new Map(baseElements
    .filter(element => element.id != null)
    .map(element => [String(element.id), element as unknown as Record<string, unknown>]))

  return displayElements.map((element) => {
    const output = clone(element) as unknown as Record<string, unknown>
    const base = baseById.get(String(element.id))
    if (!base) return output as unknown as AnyElementConfig

    const slot = (Object.entries(VISUAL_THEME_ASSET_ELEMENT_TYPES)
      .find(([, eleType]) => eleType === output.eleType)?.[0]) as VisualThemeAssetSlot | undefined
    for (const field of slot ? VISUAL_THEME_ASSET_BASE_FIELDS[slot] ?? [] : []) {
      if (Object.prototype.hasOwnProperty.call(base, field)) output[field] = base[field]
      else delete output[field]
    }
    for (const [colorField, propertyField] of VISUAL_THEME_COLOR_BINDINGS) {
      if (typeof base[propertyField] !== 'string') continue
      output[propertyField] = base[propertyField]
      if (Object.prototype.hasOwnProperty.call(base, colorField)) output[colorField] = base[colorField]
      else delete output[colorField]
    }
    return output as unknown as AnyElementConfig
  })
}

function applyAsset(
  element: Record<string, unknown>,
  slot: VisualThemeAssetSlot,
  asset: VisualThemeAssetRef,
): void {
  element.imageUrl = asset.imageUrl
  element.assetId = asset.assetId
  if (slot === 'background') element.imageId = null
  if (slot === 'centerCap' && asset.targetSize !== undefined) {
    element.targetSize = asset.targetSize
  }
}

export function projectDefaultVisualThemeForLoad(
  source: RuntimeDesignConfig,
): RuntimeDesignConfig {
  const visualThemes = source.visualThemes
  if (!visualThemes?.enabled) return source

  const theme = visualThemes.themes.find(candidate => candidate.id === visualThemes.defaultThemeId)
  if (!theme) return source

  const projected = clone(source)
  const elements = projected.elements as unknown as Array<Record<string, unknown>>

  for (const [rawSlot, eleType] of Object.entries(VISUAL_THEME_ASSET_ELEMENT_TYPES)) {
    const slot = rawSlot as VisualThemeAssetSlot
    const asset = theme.assets[slot]
    if (!asset) continue
    const element = elements.find(candidate => candidate.eleType === eleType)
    if (element) applyAsset(element, slot, asset)
  }

  for (const element of elements) {
    for (const [colorField, propertyField] of VISUAL_THEME_COLOR_BINDINGS) {
      const propertyKey = element[propertyField]
      if (typeof propertyKey !== 'string') continue
      const color = theme.colors?.[propertyKey]
      const property = projected.properties[propertyKey]
      if (color === undefined || property?.type !== 'color') continue
      property.value = color
      element[colorField] = toCanvasColor(color)
    }
  }

  return projected
}
