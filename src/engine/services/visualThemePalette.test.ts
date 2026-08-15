import { describe, expect, it } from 'vitest'
import { generateCoordinatedThemeColors } from './visualThemePalette'

const sequence = (...values: number[]) => {
  let index = 0
  return () => values[index++ % values.length]
}

const rgb = (color: string) => [
  Number.parseInt(color.slice(2, 4), 16),
  Number.parseInt(color.slice(4, 6), 16),
  Number.parseInt(color.slice(6, 8), 16),
]

const luminance = (color: string) => {
  const [red, green, blue] = rgb(color).map((channel) => channel / 255)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

describe('generateCoordinatedThemeColors', () => {
  it('generates a complete RGB color set while preserving dark and light roles', () => {
    const result = generateCoordinatedThemeColors({
      Background: '0x080A0C',
      PrimaryText: '0xF6F7F8',
      SecondaryText: '0x8A8D90',
      Accent: '0xFF3B30',
    }, sequence(0.1, 0.4, 0.7, 0.2))

    expect(Object.keys(result.colors)).toEqual([
      'Background',
      'PrimaryText',
      'SecondaryText',
      'Accent',
    ])
    expect(Object.values(result.colors).every((color) => /^0x[0-9A-F]{6}$/.test(color)))
      .toBe(true)
    expect(luminance(result.colors.Background)).toBeLessThan(0.2)
    expect(luminance(result.colors.PrimaryText)).toBeGreaterThan(0.7)
    expect(luminance(result.colors.SecondaryText)).toBeGreaterThan(0.25)
    expect(luminance(result.colors.SecondaryText)).toBeLessThan(0.7)
  })

  it('uses a cool dominant family with a controlled warm accent', () => {
    const result = generateCoordinatedThemeColors({
      Surface: '0x20252A',
      Label: '0xD5D8DA',
      Accent: '0xFF0000',
    }, sequence(0.1, 0.5, 0.5, 0.5))

    expect(result.temperature).toBe('cool')
    const [surfaceRed, , surfaceBlue] = rgb(result.colors.Surface)
    const [accentRed, , accentBlue] = rgb(result.colors.Accent)
    expect(surfaceBlue).toBeGreaterThan(surfaceRed)
    expect(accentRed).toBeGreaterThan(accentBlue)
  })

  it('returns an empty set when the theme has no colors', () => {
    expect(generateCoordinatedThemeColors({}, () => 0.5).colors).toEqual({})
  })
})
