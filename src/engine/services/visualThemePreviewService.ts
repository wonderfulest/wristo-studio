import { normalizeThemeMode, resolveThemeColor } from './visualThemeService'
import type { PropertiesMap } from '@/types/properties'
import type { VisualTheme, VisualThemeAssetSlot, VisualThemesConfig } from '@/types/visualTheme'

type ElementConfig = Record<string, any> & { id?: string | number; eleType?: string }

export interface VisualThemePreviewDependencies {
  getBaseElements: () => ElementConfig[]
  getCanvasElements: () => ElementConfig[]
  applyElement: (element: ElementConfig, patch: Record<string, unknown>) => Promise<void>
  restorePersistedElement: (config: ElementConfig) => void
  requestRender: () => void
}

const ASSET_ELEMENT_TYPES: Record<VisualThemeAssetSlot, string> = {
  background: 'background',
  hourHand: 'hourHand',
  minuteHand: 'minuteHand',
  secondHand: 'secondHand',
  centerCap: 'centerCap',
}

const COLOR_BINDINGS = [
  ['color', 'colorProperty'],
  ['bgColor', 'bgColorProperty'],
  ['stroke', 'strokeProperty'],
  ['borderColor', 'borderColorProperty'],
  ['bodyStroke', 'bodyStrokeProperty'],
  ['headFill', 'headFillProperty'],
  ['bodyFill', 'bodyFillProperty'],
  ['fill', 'fillProperty'],
  ['activeColor', 'activeColorProperty'],
  ['inactiveColor', 'inactiveColorProperty'],
  ['pointColor', 'pointColorProperty'],
  ['gridColor', 'gridColorProperty'],
  ['xAxisColor', 'xAxisColorProperty'],
  ['yAxisColor', 'yAxisColorProperty'],
  ['xLabelColor', 'xLabelColorProperty'],
  ['yLabelColor', 'yLabelColorProperty'],
  ['levelColorHigh', 'levelColorHighProperty'],
  ['levelColorMedium', 'levelColorMediumProperty'],
  ['levelColorLow', 'levelColorLowProperty'],
] as const

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function resolveAssetPatch(
  base: ElementConfig,
  theme: VisualTheme,
): Record<string, unknown> {
  const slot = (Object.entries(ASSET_ELEMENT_TYPES)
    .find(([, eleType]) => eleType === base.eleType)?.[0]) as VisualThemeAssetSlot | undefined
  if (!slot) return {}
  const asset = theme.assets[slot]
  if (!asset) {
    const patch: Record<string, unknown> = {
      imageUrl: base.imageUrl ?? null,
      assetId: base.assetId ?? null,
    }
    if (slot === 'background') patch.imageId = base.imageId ?? base.assetId ?? null
    if (slot === 'centerCap' && base.targetSize !== undefined) patch.targetSize = base.targetSize
    return patch
  }
  const patch: Record<string, unknown> = {
    imageUrl: asset.imageUrl,
    assetId: asset.assetId,
  }
  if (slot === 'background') patch.imageId = asset.assetId
  if (slot === 'centerCap' && asset.targetSize !== undefined) patch.targetSize = asset.targetSize
  return patch
}

function resolveColorPatch(
  base: ElementConfig,
  theme: VisualTheme,
  properties: PropertiesMap,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const [colorField, propertyField] of COLOR_BINDINGS) {
    const propertyKey = base[propertyField]
    if (typeof propertyKey !== 'string') continue
    const property = properties[propertyKey]
    if (!property || property.type !== 'color' || normalizeThemeMode(property.themeMode) !== 'theme') {
      if (base[colorField] !== undefined) patch[colorField] = base[colorField]
      continue
    }
    const color = resolveThemeColor(propertyKey, theme, properties)
    if (color !== undefined) patch[colorField] = color
  }
  return patch
}

export function createVisualThemePreviewController(dependencies: VisualThemePreviewDependencies) {
  let baseSnapshot: ElementConfig[] | null = null
  let generation = 0
  let queue = Promise.resolve()

  const ensureSnapshot = (): ElementConfig[] => {
    if (!baseSnapshot) baseSnapshot = clone(dependencies.getBaseElements())
    return baseSnapshot
  }

  const applyPresentation = async (
    theme: VisualTheme | null,
    properties: PropertiesMap,
    runGeneration: number,
  ): Promise<void> => {
    const bases = ensureSnapshot()
    const canvasElements = dependencies.getCanvasElements()
    for (const base of bases) {
      const canvasElement = canvasElements.find((element) =>
        element.id != null && base.id != null && String(element.id) === String(base.id))
      if (!canvasElement) continue
      const patch = theme
        ? { ...resolveAssetPatch(base, theme), ...resolveColorPatch(base, theme, properties) }
        : clone(base)
      await dependencies.applyElement(canvasElement, patch)
      dependencies.restorePersistedElement(clone(base))
      if (runGeneration !== generation) return
    }
    dependencies.requestRender()
  }

  const enqueue = (task: (runGeneration: number) => Promise<void>): Promise<void> => {
    const runGeneration = ++generation
    const result = queue.then(() => task(runGeneration))
    queue = result.catch(() => undefined)
    return result
  }

  return {
    preview(config: VisualThemesConfig, themeId: string | null, properties: PropertiesMap): Promise<void> {
      const theme = config.enabled
        ? config.themes.find((candidate) => candidate.id === themeId) ?? null
        : null
      return enqueue((runGeneration) => applyPresentation(theme, properties, runGeneration))
    },

    restore(): Promise<void> {
      if (!baseSnapshot) return Promise.resolve()
      return enqueue((runGeneration) => applyPresentation(null, {}, runGeneration))
    },

    async reset(): Promise<void> {
      await this.restore()
      baseSnapshot = null
    },
  }
}
