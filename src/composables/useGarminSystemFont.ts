import { resolvePreviewFontFamily } from '@/utils/contentFontFallback'
import { useFontStore } from '@/stores/fontStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { applyFabricRecipePreviewPropsToObject, recipeToFabricProps, savedTextStyle } from '@/features/bitmap-font-maker/recipePreview'
import type { FabricRecipePreviewProps } from '@/features/bitmap-font-maker/recipePreview'
import { canonicalFontSlug } from '@/features/bitmap-font-maker/fontSlug'
import {
  applyFabricBitmapFontPreview,
  type FabricBitmapFontPreviewAssets,
} from '@/features/bitmap-font-preview/fabricBitmapFontPreview'

export interface TextFontPreviewConfig {
  fontFamily?: string
  fontSize?: number
  fill?: unknown
}

export interface ResolvedTextPreviewFont {
  fontFamily: string
  fontSize?: number
  readonly bitmapRecipePreview?: FabricRecipePreviewProps
  readonly bitmapPreviewAssets?: FabricBitmapFontPreviewAssets
}

const previewGeneration = Symbol('currentElementFontPreviewGeneration')

const requestPreviewRender = (object: any): void => {
  const objectCanvas = object?.canvas
  if (objectCanvas?.requestRenderAll) {
    objectCanvas.requestRenderAll()
    return
  }
  useCanvasStore().canvas?.requestRenderAll?.()
}

export const resolveCurrentElementPreviewFont = (config: TextFontPreviewConfig, content: unknown = ''): ResolvedTextPreviewFont => {
  const slug = String(config.fontFamily || 'sans-serif')
  const base: ResolvedTextPreviewFont = {
    fontFamily: resolvePreviewFontFamily(content, slug),
    fontSize: config.fontSize
  }
  const font = useFontStore().serverFonts.get(canonicalFontSlug(slug))
  const preview = recipeToFabricProps(font?.bitmapRecipe, config.fontSize, config.fill)
  const previewSize = Number(font?.bitmapPreviewSize)
  const bitmapPreviewAssets = font?.bitmapPreviewDescriptorUrl
    && font.bitmapPreviewAtlasUrl
    && Number.isFinite(previewSize)
    && previewSize > 0
    ? {
        descriptorUrl: font.bitmapPreviewDescriptorUrl,
        atlasUrl: font.bitmapPreviewAtlasUrl,
        sourceSize: previewSize,
        color: typeof config.fill === 'string' ? config.fill : undefined,
      }
    : undefined
  Object.defineProperty(base, 'bitmapRecipePreview', {
    configurable: false,
    enumerable: false,
    value: preview,
  })
  Object.defineProperty(base, 'bitmapPreviewAssets', {
    configurable: false,
    enumerable: false,
    value: bitmapPreviewAssets,
  })
  return base
}

export function applyBitmapRecipePreview(
  object: any,
  resolved: ResolvedTextPreviewFont,
  baselineFill?: unknown,
): void {
  const fill = baselineFill ?? savedTextStyle(object).fill ?? object?.fill
  applyFabricRecipePreviewPropsToObject(object, resolved.bitmapRecipePreview, fill)
}

function applyResolvedFontRenderer(
  object: any,
  resolved: ResolvedTextPreviewFont,
  baselineFill?: unknown,
): void {
  if (!object) return
  const fill = baselineFill ?? savedTextStyle(object).fill ?? object.fill
  const generation = Number(object[previewGeneration] || 0) + 1
  Object.defineProperty(object, previewGeneration, {
    configurable: true,
    writable: true,
    value: generation,
  })

  applyBitmapRecipePreview(object, resolved, fill)
  const assets = resolved.bitmapPreviewAssets
  if (!assets) {
    void applyFabricBitmapFontPreview(object)
    return
  }

  void applyFabricBitmapFontPreview(object, {
    ...assets,
    color: typeof fill === 'string' ? fill : assets.color,
  }).then(() => {
    if (object[previewGeneration] !== generation) return
    applyFabricRecipePreviewPropsToObject(object, undefined, fill)
    object.initDimensions?.()
    object.setCoords?.()
    object.dirty = true
    requestPreviewRender(object)
  }).catch((error) => {
    if (object[previewGeneration] !== generation) return
    console.error('Failed to apply BMFont canvas preview', error)
  })
}

export function applyCurrentElementPreviewFont(object: any, config: TextFontPreviewConfig, content: unknown = ''): ResolvedTextPreviewFont {
  const resolved = resolveCurrentElementPreviewFont(config, content)
  const selectedFontFamily = String(config.fontFamily || object?.assetFontFamily || object?.fontFamily || 'sans-serif')
  const fontSize = config.fontSize ?? object?.fontSize
  const fill = config.fill ?? savedTextStyle(object).fill ?? object?.fill
  if (object) object.assetFontFamily = selectedFontFamily
  object?.set?.({ fontFamily: resolved.fontFamily, fontSize })
  applyResolvedFontRenderer(object, resolved, fill)
  if (Array.isArray(object?._objects)) {
    object._objects.forEach((child: any) => {
      child.assetFontFamily = selectedFontFamily
      child?.set?.({ fontFamily: resolved.fontFamily, fontSize })
      applyResolvedFontRenderer(child, resolved, fill)
      child?.initDimensions?.()
      child?.setCoords?.()
      child.dirty = true
    })
  }
  object?.initDimensions?.()
  object?.setCoords?.()
  if (object) object.dirty = true
  object?.canvas?.requestRenderAll?.()
  return resolved
}
