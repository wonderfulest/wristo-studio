export const DEFAULT_WEATHER_ICON_CODE = '101d'

export const WEATHER_ICON_CODES = new Set([
  '101d', '101e', '102d', '102e', '103d', '104d',
  '109d', '110d', '110e', '111d', '113d', '150d',
])

const normalizeCode = (value: unknown): string => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/^(?:\\u|u\+|0x)/, '')

export const isWeatherIconCode = (value: unknown): boolean => WEATHER_ICON_CODES.has(normalizeCode(value))

export const normalizeWeatherIconCode = (value: unknown): string => {
  const code = normalizeCode(value)
  return WEATHER_ICON_CODES.has(code) ? code : DEFAULT_WEATHER_ICON_CODE
}

const WEATHER_GLYPH_HORIZONTAL_OFFSETS: Record<string, number> = {
  '102d': 0.56,
  '102e': 0.56,
  '103d': 0.47,
}

export const getWeatherGlyphHorizontalOffset = (value: unknown): number =>
  WEATHER_GLYPH_HORIZONTAL_OFFSETS[normalizeWeatherIconCode(value)] ?? 0
