import type { IconGlyphAssetVO } from '@/api/wristo/iconGlyph'
import type { WeatherSvgSource } from '@/features/bitmap-font-maker/weatherPackageBuilder'
import { WEATHER_FONT_SLOTS } from '@/features/bitmap-font-maker/weatherSourceSet'
import { loadSvgIconBuildSources } from './svgIconBuildSources'

type FetchSvg = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export async function loadWeatherBuildSources(relations: IconGlyphAssetVO[], fetchSvg: FetchSvg = fetch): Promise<WeatherSvgSource[]> {
  try {
    return await loadSvgIconBuildSources(WEATHER_FONT_SLOTS, relations, fetchSvg)
  } catch (error) {
    if (error instanceof Error && error.message === 'SVG_ICON_SOURCE_SET_INCOMPLETE') {
      throw new Error('WEATHER_SOURCE_SET_INCOMPLETE')
    }
    if (error instanceof Error && error.message === 'SVG_ICON_SOURCE_FETCH_FAILED') {
      throw new Error('WEATHER_SOURCE_FETCH_FAILED')
    }
    throw error
  }
}
