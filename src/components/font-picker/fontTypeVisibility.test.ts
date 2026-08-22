import { describe, expect, it } from 'vitest'
import { isFontTypeVisible, normalizeAllowedFontTypes } from './fontTypeVisibility'

describe('font type visibility', () => {
  it('normalizes and deduplicates allowed font types', () => {
    expect(normalizeAllowedFontTypes([' NUMBER_FONT ', 'number_font', 'TEXT_FONT'])).toEqual([
      'number_font',
      'text_font',
    ])
  })

  it('keeps fonts whose type is omitted from an already filtered API response', () => {
    expect(isFontTypeVisible(undefined, ['number_font', 'text_font'])).toBe(true)
  })

  it('rejects an explicit type outside the allowed set', () => {
    expect(isFontTypeVisible('icon_font', ['number_font', 'text_font'])).toBe(false)
  })
})
