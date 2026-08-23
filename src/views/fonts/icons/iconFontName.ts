import type { IconGlyphFontType } from '@/api/wristo/iconGlyph'

const padDatePart = (value: number): string => String(value).padStart(2, '0')

export const formatSvgIconFontSlug = (type: IconGlyphFontType, date: Date, suffix: string): string => {
  const prefix = type === 'weather_font' ? 'weather-font' : 'icon-font'
  if (type === 'weather_font') return `${prefix}-${suffix}`

  const datePart = [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('')
  return `${prefix}-${datePart}-${suffix}`
}

const generateHexSuffix = (byteLength: number): string => {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(byteLength))
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
  }
  const maximum = 16 ** (byteLength * 2)
  return Math.floor(Math.random() * maximum).toString(16).padStart(byteLength * 2, '0')
}

export const generateSvgIconFontSlug = (
  type: IconGlyphFontType,
  date = new Date(),
  createSuffix?: () => string,
): string => formatSvgIconFontSlug(
  type,
  date,
  createSuffix?.() ?? generateHexSuffix(type === 'weather_font' ? 3 : 2),
)
