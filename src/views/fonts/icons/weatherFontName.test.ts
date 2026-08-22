import { describe, expect, it } from 'vitest'

import { formatWeatherFontSlug, generateWeatherFontSlug } from './weatherFontName'

describe('weather font automatic naming', () => {
  it('formats the local date and four-character hexadecimal suffix', () => {
    const date = new Date(2026, 7, 22, 9, 30)

    expect(formatWeatherFontSlug(date, 'a3f2')).toBe('weather-font-20260822-a3f2')
  })

  it('generates the suffix without requiring user input', () => {
    const date = new Date(2026, 7, 22, 9, 30)

    expect(generateWeatherFontSlug(date, () => '09bf')).toBe('weather-font-20260822-09bf')
  })
})
