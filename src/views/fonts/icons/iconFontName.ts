import type { IconGlyphFontType } from '@/api/wristo/iconGlyph'

const padDatePart = (value: number): string => String(value).padStart(2, '0')

export const formatSvgIconFontSlug = (type: IconGlyphFontType, date: Date, suffix: string): string => {
  const datePart = [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('')
  const prefix = type === 'weather_font' ? 'weather-font' : 'icon-font'
  return `${prefix}-${datePart}-${suffix}`
}

const generateHexSuffix = (): string => {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(2))
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
  }
  return Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')
}

export const generateSvgIconFontSlug = (
  type: IconGlyphFontType,
  date = new Date(),
  createSuffix: () => string = generateHexSuffix,
): string => formatSvgIconFontSlug(type, date, createSuffix())
