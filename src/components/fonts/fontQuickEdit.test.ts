import { describe, expect, it } from 'vitest'
import { canQuickEditFont, resolveFontQuickEditLocation } from './fontQuickEdit'

describe('font quick edit routing', () => {
  it.each([
    ['time_font', 'BitmapFontMaker', { fontId: '41', fontType: 'time_font' }],
    ['text_font', 'BitmapFontMaker', { fontId: '41', fontType: 'text_font' }],
    ['text_font_zh', 'BitmapFontMaker', { fontId: '41', fontType: 'text_font_zh' }],
    ['icon_font', 'IconLibrary', { fontId: '41', glyphCode: 'my-icons', editBitmap: '1' }],
    ['weather_font', 'WeatherFontLibrary', { fontId: '41', glyphCode: 'my-icons', editBitmap: '1' }],
  ])('routes %s to its existing bitmap editor', (type, name, query) => {
    expect(resolveFontQuickEditLocation({ id: 41, type, slug: 'my-icons' })).toEqual({ name, query })
  })

  it('shows quick edit only for a non-system font owned by the current user', () => {
    expect(canQuickEditFont({ ownerUserId: 7, currentUserId: 7, isSystem: false, type: 'text_font' })).toBe(true)
    expect(canQuickEditFont({ ownerUserId: 8, currentUserId: 7, isSystem: false, type: 'text_font' })).toBe(false)
    expect(canQuickEditFont({ ownerUserId: 7, currentUserId: 7, isSystem: true, type: 'text_font' })).toBe(false)
    expect(canQuickEditFont({ ownerUserId: 7, currentUserId: 7, isSystem: false, type: 'unknown' })).toBe(false)
  })

  it.each([
    'time_font',
    'text_font',
    'text_font_zh',
    'icon_font',
    'weather_font',
  ])('allows an admin to edit any supported %s regardless of owner or system status', (type) => {
    expect(canQuickEditFont({
      ownerUserId: 99,
      currentUserId: 7,
      currentUserIsAdmin: true,
      isSystem: true,
      type,
    })).toBe(true)
  })
})
