import { resolvePreviewFontFamily } from '@/utils/contentFontFallback'
import { useFontStore } from '@/stores/fontStore'
import { applyFabricRecipePreviewPropsToObject, recipeToFabricProps, savedTextStyle } from '@/features/bitmap-font-maker/recipePreview'
import type { FabricRecipePreviewProps } from '@/features/bitmap-font-maker/recipePreview'
import { canonicalFontSlug } from '@/features/bitmap-font-maker/fontSlug'

export interface TextFontPreviewConfig {
  fontFamily?: string
  fontSize?: number
  fill?: unknown
}

export interface ResolvedTextPreviewFont {
  fontFamily: string
  fontSize?: number
  readonly bitmapRecipePreview?: FabricRecipePreviewProps
}

export const resolveCurrentElementPreviewFont = (config: TextFontPreviewConfig, content: unknown = ''): ResolvedTextPreviewFont => {
  const slug = String(config.fontFamily || 'sans-serif')
  const base: ResolvedTextPreviewFont = {
    fontFamily: resolvePreviewFontFamily(content, slug),
    fontSize: config.fontSize
  }
  const recipe = useFontStore().serverFonts.get(canonicalFontSlug(slug))?.bitmapRecipe
  const preview = recipeToFabricProps(recipe, config.fontSize, config.fill)
  Object.defineProperty(base, 'bitmapRecipePreview', {
    configurable: false,
    enumerable: false,
    value: preview,
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

export function applyCurrentElementPreviewFont(object: any, config: TextFontPreviewConfig, content: unknown = ''): ResolvedTextPreviewFont {
  const resolved = resolveCurrentElementPreviewFont(config, content)
  const fontSize = config.fontSize ?? object?.fontSize
  const fill = config.fill ?? savedTextStyle(object).fill ?? object?.fill
  object?.set?.({ fontFamily: resolved.fontFamily, fontSize })
  applyBitmapRecipePreview(object, resolved, fill)
  if (Array.isArray(object?._objects)) {
    object._objects.forEach((child: any) => {
      child?.set?.({ fontFamily: resolved.fontFamily, fontSize })
      applyBitmapRecipePreview(child, resolved, fill)
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
