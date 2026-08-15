import { resolvePreviewFontFamily } from '@/utils/contentFontFallback'
import { useFontStore } from '@/stores/fontStore'
import { applyRecipePreviewToFabricObject, recipeToFabricProps, savedTextStyle } from '@/features/bitmap-font-maker/recipePreview'

export interface TextFontPreviewConfig {
  fontFamily?: string
  fontSize?: number
  fill?: unknown
}

export const resolveCurrentElementPreviewFont = (config: TextFontPreviewConfig, content: unknown = ''): Record<string, unknown> => {
  const slug = String(config.fontFamily || 'sans-serif')
  const base = {
    fontFamily: resolvePreviewFontFamily(content, slug),
    fontSize: config.fontSize
  }
  const recipe = useFontStore().serverFonts.get(slug)?.bitmapRecipe
  const preview = recipeToFabricProps(recipe, config.fontSize, config.fill)
  return preview ? { ...base, ...preview } : base
}

export function applyCurrentElementPreviewFont(object: any, config: TextFontPreviewConfig, content: unknown = ''): Record<string, unknown> {
  const resolved = resolveCurrentElementPreviewFont(config, content)
  const slug = String(config.fontFamily || object?.fontFamily || 'sans-serif')
  const recipe = useFontStore().serverFonts.get(slug)?.bitmapRecipe
  const fontSize = config.fontSize ?? object?.fontSize
  const fill = config.fill ?? savedTextStyle(object).fill ?? object?.fill
  object?.set?.({ fontFamily: resolved.fontFamily, fontSize })
  applyRecipePreviewToFabricObject(object, recipe, fontSize, fill)
  if (Array.isArray(object?._objects)) {
    object._objects.forEach((child: any) => {
      child?.set?.({ fontFamily: resolved.fontFamily, fontSize })
      applyRecipePreviewToFabricObject(child, recipe, fontSize, fill)
      child?.initDimensions?.()
      child?.setCoords?.()
      child.dirty = true
    })
  }
  return resolved
}
