export interface WeatherFontSlot {
  iconUnicode: string
  codepoint: number
  symbolCode: string
  label: string
  aliases: string[]
}

const slots = [
  ['101d', 'clear_sky', 'Clear sky', ['clear', 'sunny']],
  ['101e', 'clear_sky_night', 'Clear night', ['clear_night', 'night_clear']],
  ['102d', 'partly_cloudy', 'Partly cloudy', ['few_clouds', 'partly_cloudy_day']],
  ['102e', 'partly_cloudy_night', 'Partly cloudy night', ['few_clouds_night']],
  ['103d', 'cloudy', 'Cloudy', ['scattered_clouds']],
  ['104d', 'overcast', 'Overcast', ['broken_clouds']],
  ['109d', 'rain', 'Rain', ['shower_rain']],
  ['110d', 'thunderstorm', 'Thunderstorm', ['storm']],
  ['110e', 'thunderstorm_night', 'Thunderstorm night', ['storm_night']],
  ['111d', 'snow', 'Snow', ['snowy']],
  ['113d', 'mist', 'Mist', ['fog', 'haze']],
  ['150d', 'wind', 'Wind', ['windy']]
] as const

export const WEATHER_FONT_SLOTS: readonly WeatherFontSlot[] = Object.freeze(
  slots.map(([iconUnicode, symbolCode, label, aliases]) => ({
    iconUnicode,
    codepoint: Number.parseInt(iconUnicode, 16),
    symbolCode,
    label,
    aliases: [...aliases]
  }))
)

export const WEATHER_FONT_CODEPOINTS = Object.freeze(WEATHER_FONT_SLOTS.map((slot) => slot.codepoint))

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.svg$/i, '')
    .replace(/^[0-9a-f]{4,6}[-_\s]*/i, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

export function matchWeatherSlotFromFileName(fileName: string): WeatherFontSlot | undefined {
  const baseName = fileName.split(/[\\/]/).pop() || ''
  const unicode = /^([0-9a-f]{4,6})(?:[-_.\s]|$)/i.exec(baseName)?.[1]?.toLowerCase()
  if (unicode) {
    const matched = WEATHER_FONT_SLOTS.find((slot) => slot.iconUnicode === unicode)
    if (matched) return matched
  }

  const normalized = normalizeName(baseName)
  return WEATHER_FONT_SLOTS.find((slot) => {
    return [slot.symbolCode, ...slot.aliases].some((alias) => normalizeName(alias) === normalized)
  })
}

export class WeatherSvgValidationError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'WeatherSvgValidationError'
  }
}

export function validateWeatherSvgSource(source: string): void {
  const trimmed = source.trim()
  const documentRoot = trimmed
    .replace(/^<\?xml\s[^?]*\?>\s*/i, '')
    .replace(/^<!DOCTYPE\s+svg\b[^>]*>\s*/i, '')
  if (!/^<svg\b/i.test(documentRoot) || !/<\/svg>\s*$/i.test(documentRoot)) {
    throw new WeatherSvgValidationError('SVG_ROOT_REQUIRED')
  }
  if (/<(?:script|foreignObject|iframe|object|embed|audio|video)\b/i.test(trimmed) || /\son[a-z]+\s*=/i.test(trimmed)) {
    throw new WeatherSvgValidationError('SVG_SCRIPT_NOT_ALLOWED')
  }
  if (/\b(?:href|xlink:href)\s*=\s*["']\s*(?!#)[^"']+/i.test(trimmed) || /url\(\s*["']?\s*(?:https?:|\/\/|data:)/i.test(trimmed) || /@import\b/i.test(trimmed)) {
    throw new WeatherSvgValidationError('SVG_EXTERNAL_REFERENCE_NOT_ALLOWED')
  }
}
