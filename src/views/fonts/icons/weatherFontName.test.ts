import { describe, expect, it } from 'vitest'

import { formatWeatherFontSlug, generateWeatherFontSlug } from './weatherFontName'

describe('weather font automatic naming', () => {
  it('formats a six-character hexadecimal suffix without the date', () => {
    const date = new Date(2026, 7, 22, 9, 30)

    expect(formatWeatherFontSlug(date, 'a3f209')).toBe('weather-font-a3f209')
  })

  it('generates the suffix without requiring user input', () => {
    const date = new Date(2026, 7, 22, 9, 30)

    expect(generateWeatherFontSlug(date, () => '09bf12')).toBe('weather-font-09bf12')
  })
})
