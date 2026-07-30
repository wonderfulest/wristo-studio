import { resolveThemeColor } from './visualThemeService'
import type { PropertiesMap } from '@/types/properties'
import type { VisualTheme, VisualThemeAssetSlot, VisualThemesConfig } from '@/types/visualTheme'
import {
  VISUAL_THEME_ASSET_ELEMENT_TYPES,
  VISUAL_THEME_COLOR_BINDINGS,
} from './visualThemeElementFields'

type ElementConfig = Record<string, any> & { id?: string | number; eleType?: string }

export interface VisualThemePreviewDependencies {
  getBaseElements: () => ElementConfig[]
  getCanvasElements: () => ElementConfig[]
  applyElement: (
    element: ElementConfig,
    patch: Record<string, unknown>,
    context: { persist: false },
  ) => Promise<void>
  requestRender: () => void
  onError?: (error: unknown) => void
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const toCanvasColor = (color: string): string =>
  /^0x[0-9a-f]{6}$/i.test(color) ? `#${color.slice(2)}` : color
function resolveAssetPatch(
  base: ElementConfig,
  theme: VisualTheme,
): Record<string, unknown> {
  const slot = (Object.entries(VISUAL_THEME_ASSET_ELEMENT_TYPES)
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
  if (slot === 'background') patch.imageId = null
  if (slot === 'centerCap' && asset.targetSize !== undefined) patch.targetSize = asset.targetSize
  return patch
}

function resolveColorPatch(
  base: ElementConfig,
  liveElement: ElementConfig,
  theme: VisualTheme,
  properties: PropertiesMap,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const [colorField, propertyField] of VISUAL_THEME_COLOR_BINDINGS) {
    const livePropertyKey = liveElement[propertyField]
    const basePropertyKey = base[propertyField]
    const propertyKey = livePropertyKey ?? basePropertyKey
    if (typeof propertyKey !== 'string' || !propertyKey) continue
    const property = properties[propertyKey]
    if (!property || property.type !== 'color') {
      if (base[colorField] !== undefined) patch[colorField] = base[colorField]
      continue
    }
    if (theme.colors[propertyKey] === undefined) {
      if (base[colorField] !== undefined) patch[colorField] = base[colorField]
      continue
    }
    const color = resolveThemeColor(propertyKey, theme, properties)
    const canvasColor = color === undefined ? undefined : toCanvasColor(color)
    if (canvasColor !== undefined) patch[colorField] = canvasColor
  }
  return patch
}

export function createVisualThemePreviewController(dependencies: VisualThemePreviewDependencies) {
  let baseSnapshot: ElementConfig[] | null = null
  let generation = 0
  let queue = Promise.resolve()

  const applyPresentation = async (
    theme: VisualTheme | null,
    properties: PropertiesMap,
    runGeneration: number,
    baseOverride?: ElementConfig[],
    canvasOverride?: ElementConfig[],
  ): Promise<void> => {
    const bases = baseOverride ?? baseSnapshot ?? clone(dependencies.getBaseElements())
    const canvasElements = canvasOverride ?? dependencies.getCanvasElements()
    for (const base of bases) {
      const canvasElement = canvasElements.find((element) =>
        element.id != null && base.id != null && String(element.id) === String(base.id))
      if (!canvasElement) continue
      const patch = theme
        ? {
            ...resolveAssetPatch(base, theme),
            ...resolveColorPatch(base, canvasElement, theme, properties),
          }
        : clone(base)
      await dependencies.applyElement(canvasElement, patch, { persist: false })
      if (runGeneration !== generation) return
    }
    dependencies.requestRender()
  }

  const enqueue = (task: (runGeneration: number) => Promise<void>): Promise<void> => {
    const runGeneration = ++generation
    const result = queue.then(() => task(runGeneration)).catch((error) => {
      dependencies.onError?.(error)
    })
    queue = result.catch(() => undefined)
    return result
  }

  return {
    preview(config: VisualThemesConfig, themeId: string | null, properties: PropertiesMap): Promise<void> {
      const bases = clone(dependencies.getBaseElements())
      const canvasElements = dependencies.getCanvasElements()
      baseSnapshot = bases
      const theme = config.enabled
        ? config.themes.find((candidate) => candidate.id === themeId) ?? null
        : null
      return enqueue(async (runGeneration) => {
        try {
          await applyPresentation(theme, properties, runGeneration, bases, canvasElements)
        } catch (error) {
          if (runGeneration === generation) {
            await applyPresentation(null, {}, runGeneration, bases, canvasElements)
          }
          throw error
        }
      })
    },

    restore(): Promise<void> {
      if (!baseSnapshot) return Promise.resolve()
      const bases = clone(dependencies.getBaseElements())
      const canvasElements = dependencies.getCanvasElements()
      baseSnapshot = bases
      return enqueue((runGeneration) => applyPresentation(null, {}, runGeneration, bases, canvasElements))
    },

    reset(): Promise<void> {
      if (!baseSnapshot) return Promise.resolve()
      const bases = baseSnapshot
      const canvasElements = dependencies.getCanvasElements()
      baseSnapshot = null
      return enqueue((runGeneration) => applyPresentation(null, {}, runGeneration, bases, canvasElements))
    },
  }
}
