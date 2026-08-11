import { describe, expect, it } from 'vitest'
import {
  buildColorPropertyOptions,
  getColorPropertyOptionDisplayLabel,
  moveColorPropertyOption,
  normalizeRgb565GarminColor,
  removeColorPropertyOption,
  updateColorPropertyDefault
} from './colorPropertyOptions'

describe('getColorPropertyOptionDisplayLabel', () => {
  it.each([
    ['Default', '默认'],
    ['Transparent', '透明'],
    ['White', '白色'],
    ['Dark Gray', '深灰色'],
    ['Torch Red', '火炬红'],
    ['Black', '黑色']
  ])('shows %s in Simplified Chinese as %s', (label, expected) => {
    expect(getColorPropertyOptionDisplayLabel(label, 'zh')).toBe(expected)
  })

  it('keeps stored labels for English, Traditional Chinese, and custom options', () => {
    expect(getColorPropertyOptionDisplayLabel('White', 'en')).toBe('White')
    expect(getColorPropertyOptionDisplayLabel('White', 'zh-tw')).toBe('White')
    expect(getColorPropertyOptionDisplayLabel('Brand Color', 'zh')).toBe('Brand Color')
  })
})

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

  it.each([
    ['#ffffff', { label: 'White', value: '0xFFFFFF' }, { label: 'Black', value: '0x000000' }],
    ['#000000', { label: 'Black', value: '0x000000' }, { label: 'White', value: '0xFFFFFF' }]
  ])('keeps Default and removes the matching standard color for %s', (defaultColor, duplicateOption, remainingOption) => {
    const result = buildColorPropertyOptions(defaultColor, standard)

    expect(result).toEqual([
      { label: 'Default', value: normalizeRgb565GarminColor(defaultColor) },
      remainingOption,
      { label: 'Transparent', value: '-1' }
    ])
    expect(result).not.toContainEqual(duplicateOption)
  })

  it('rebuilds options without legacy custom colors', () => {
    const result = buildColorPropertyOptions('#abcdef', standard)
    expect(result.some((option) => option.label.startsWith('Custom'))).toBe(false)
    expect(result).toHaveLength(4)
  })

  it('keeps user deletions when the Default color changes', () => {
    const options = buildColorPropertyOptions('#123456', standard).filter((option) => option.label !== 'Black')

    expect(updateColorPropertyDefault(options, '#abcdef')).toEqual([
      { label: 'Default', value: '0xadcfef' },
      { label: 'White', value: '0xFFFFFF' },
      { label: 'Transparent', value: '-1' }
    ])
  })

  it('keeps Transparent when the Default color changes to white', () => {
    const options = buildColorPropertyOptions('#123456', standard)

    expect(updateColorPropertyDefault(options, '#ffffff')).toContainEqual({ label: 'Transparent', value: '-1' })
  })

  it('removes a regular option but never removes Default', () => {
    const options = buildColorPropertyOptions('#123456', standard)

    expect(removeColorPropertyOption(options, 1)).toEqual([options[0], options[2], options[3]])
    expect(removeColorPropertyOption(options, 0)).toEqual(options)
  })

  it('reorders regular options without moving Default', () => {
    const options = buildColorPropertyOptions('#123456', standard)

    expect(moveColorPropertyOption(options, 2, 'up')).toEqual([options[0], options[2], options[1], options[3]])
    expect(moveColorPropertyOption(options, 1, 'up')).toEqual(options)
  })
})
