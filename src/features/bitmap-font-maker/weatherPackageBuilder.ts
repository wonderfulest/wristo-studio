import {
  buildSvgIconBitmapFontPackage,
  type SvgIconBitmapFontBuildProgress,
  type SvgIconBitmapFontBuildResult,
  type SvgIconBitmapFontManifest,
  type SvgIconBitmapFontRecipe,
  type SvgIconPackageBuilderAdapters,
  type SvgIconRenderedGlyph,
  type SvgIconRenderedGlyphSet,
  type SvgIconSource,
} from './svgIconPackageBuilder'
import { WEATHER_FONT_SLOTS } from './weatherSourceSet'

export type WeatherBitmapFontRecipe = SvgIconBitmapFontRecipe
export type WeatherSvgSource = SvgIconSource
export type WeatherRenderedGlyph = SvgIconRenderedGlyph
export type WeatherRenderedGlyphSet = SvgIconRenderedGlyphSet
export type WeatherBitmapFontBuildProgress = SvgIconBitmapFontBuildProgress
export type WeatherPackageBuilderAdapters = SvgIconPackageBuilderAdapters

export type WeatherBitmapFontManifest = SvgIconBitmapFontManifest & {
  type: 'weather_font'
  charset: { profile: 'wristo-weather-v1'; codepoints: number[] }
}

export interface WeatherBitmapFontBuildRequest {
  slug: string
  sources: WeatherSvgSource[]
  recipe: WeatherBitmapFontRecipe
}

export type WeatherBitmapFontBuildResult = Omit<SvgIconBitmapFontBuildResult, 'manifest'> & {
  manifest: WeatherBitmapFontManifest
}

export async function buildWeatherBitmapFontPackage(
  request: WeatherBitmapFontBuildRequest,
  adapters?: WeatherPackageBuilderAdapters,
  onProgress: (progress: WeatherBitmapFontBuildProgress) => void = () => undefined,
  isCancelled: () => boolean = () => false,
): Promise<WeatherBitmapFontBuildResult> {
  const result = await buildSvgIconBitmapFontPackage(
    {
      ...request,
      type: 'weather_font',
      charsetProfile: 'wristo-weather-v1',
      slots: WEATHER_FONT_SLOTS,
    },
    adapters,
    onProgress,
    isCancelled,
  )
  return result as WeatherBitmapFontBuildResult
}
