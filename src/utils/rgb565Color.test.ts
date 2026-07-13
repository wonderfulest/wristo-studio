import { describe, expect, it } from 'vitest'
import { clampUnit, hsvToRgb, normalizeRgb565Hex, parseHexColor, rgbToHex, rgbToHsv } from './rgb565Color'

describe('rgb565Color', () => {
  it.each([
    ['#000000', '#000000'],
    ['#FFFFFF', '#FFFFFF'],
    ['#123456', '#103452'],
    ['0xABCDEF', '#ADCFEF'],
    ['abcdef', '#ADCFEF'],
    ['transparent', '#FFFFFF']
  ])('quantizes %s as %s', (input, expected) => {
    expect(normalizeRgb565Hex(input)).toBe(expected)
  })

  it('keeps an RGB565 value stable', () => {
    const value = normalizeRgb565Hex('#39A7D4')
    expect(normalizeRgb565Hex(value)).toBe(value)
  })

  it('parses supported hex forms and rejects invalid input', () => {
    expect(parseHexColor('0x123456')).toEqual({ r: 18, g: 52, b: 86 })
    expect(parseHexColor('bad')).toBeNull()
  })

  it('round-trips primary colors through HSV', () => {
    for (const rgb of [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 }
    ]) {
      expect(hsvToRgb(rgbToHsv(rgb))).toEqual(rgb)
      expect(rgbToHex(rgb)).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('clamps normalized coordinates', () => {
    expect(clampUnit(-0.2)).toBe(0)
    expect(clampUnit(0.4)).toBe(0.4)
    expect(clampUnit(1.2)).toBe(1)
  })
})
