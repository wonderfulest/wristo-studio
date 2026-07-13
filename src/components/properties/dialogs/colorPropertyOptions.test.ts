import { describe, expect, it } from 'vitest'
import { buildColorPropertyOptions, normalizeRgb565GarminColor } from './colorPropertyOptions'

describe('normalizeRgb565GarminColor', () => {
  it.each([
    ['#000000', '0x000000'],
    ['#ffffff', '0xffffff'],
    ['0x123456', '0x103452'],
    ['abcdef', '0xadcfef'],
    ['', '0xffffff'],
    ['transparent', '0xffffff']
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeRgb565GarminColor(input)).toBe(expected)
  })

  it('is idempotent', () => {
    const once = normalizeRgb565GarminColor('#39a7d4')
    expect(normalizeRgb565GarminColor(once)).toBe(once)
  })
})

describe('buildColorPropertyOptions', () => {
  const standard = [
    { label: 'White', value: '0xFFFFFF' },
    { label: 'Black', value: '0x000000' }
  ]

  it('builds Default, standard colors, and Transparent in fixed order', () => {
    expect(buildColorPropertyOptions('#123456', standard)).toEqual([{ label: 'Default', value: '0x103452' }, ...standard, { label: 'Transparent', value: '-1' }])
  })

  it('rebuilds options without legacy custom colors', () => {
    const result = buildColorPropertyOptions('#abcdef', standard)
    expect(result.some((option) => option.label.startsWith('Custom'))).toBe(false)
    expect(result).toHaveLength(4)
  })
})
