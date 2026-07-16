import { describe, expect, it } from 'vitest'
import { MAX_ICON_FONT_SLUG_LENGTH, normalizeIconFontSlug } from './iconFontSlug'

describe('normalizeIconFontSlug', () => {
  it.each([
    ['Animal Cute', 'animal-cute'],
    ['Ink_Wash Mono', 'ink-wash-mono'],
    ['Wristo', 'wristo'],
    ['  animal---cute  ', 'animal-cute'],
    ['', ''],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeIconFontSlug(input)).toBe(expected)
  })

  it('limits the slug to the glyph_code column length without a trailing separator', () => {
    const slug = normalizeIconFontSlug(`${'a'.repeat(62)} three`)
    expect(slug.length).toBeLessThanOrEqual(MAX_ICON_FONT_SLUG_LENGTH)
    expect(slug).not.toMatch(/-$/)
  })
})
