import { describe, expect, it } from 'vitest'
import { sortSystemFontsFirst } from './fontSort'

describe('sortSystemFontsFirst', () => {
  it('places system fonts before asset fonts while preserving each group order', () => {
    const fonts = [
      { slug: 'asset-favorite', isSystem: 0, favoriteWeight: 100 },
      { slug: 'system-regular', isSystem: 1, favoriteWeight: null },
      { slug: 'asset-regular', isSystem: 0, favoriteWeight: null },
      { slug: 'system-favorite', isSystem: 1, favoriteWeight: 20 }
    ]

    expect(sortSystemFontsFirst(fonts).map((font) => font.slug)).toEqual(['system-regular', 'system-favorite', 'asset-favorite', 'asset-regular'])
  })

  it('recognizes boolean system-font metadata used by picker items', () => {
    const fonts = [
      { value: 'asset-font', isSystem: false },
      { value: 'system-font', isSystem: true }
    ]

    expect(sortSystemFontsFirst(fonts).map((font) => font.value)).toEqual(['system-font', 'asset-font'])
  })
})
