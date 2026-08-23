import { describe, expect, it } from 'vitest'
import { formatSvgIconFontSlug, generateSvgIconFontSlug } from './iconFontName'

describe('SVG icon font automatic naming', () => {
  it('uses the ordinary icon prefix for icon fonts', () => {
    const date = new Date(2026, 7, 22, 9, 30)
    expect(formatSvgIconFontSlug('icon_font', date, 'a3f2')).toBe('icon-font-20260822-a3f2')
  })

  it('keeps the weather prefix for weather fonts', () => {
    const date = new Date(2026, 7, 22, 9, 30)
    expect(generateSvgIconFontSlug('weather_font', date, () => '09bf12')).toBe('weather-font-09bf12')
  })
})
