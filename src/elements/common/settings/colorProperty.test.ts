import { describe, expect, it } from 'vitest'
import { getColorPropertyEntries, normalizePropertyColor } from './colorProperty'

describe('normalizePropertyColor', () => {
  it.each([
    ['0x9EEA20', '#9eea20'],
    ['#AABBCC', '#aabbcc'],
    ['55AAFF', '#55aaff'],
    ['-1', 'transparent'],
    ['transparent', 'transparent'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizePropertyColor(input)).toBe(expected)
  })

  it.each([undefined, null, '', 'not-a-color'])('falls back for %s', (input) => {
    expect(normalizePropertyColor(input)).toBe('#ffffff')
  })
})

describe('getColorPropertyEntries', () => {
  it('returns only color properties with normalized values', () => {
    const properties = {
      accentColor: { type: 'color', title: 'Accent', value: '0x9EEA20' },
      steps: { type: 'data', title: 'Steps', value: ':STEPS' },
      minorColor: { type: 'color', title: 'Minor', value: '#777777' },
    } as any

    expect(getColorPropertyEntries(properties)).toEqual([
      ['accentColor', properties.accentColor, '#9eea20'],
      ['minorColor', properties.minorColor, '#777777'],
    ])
  })
})
