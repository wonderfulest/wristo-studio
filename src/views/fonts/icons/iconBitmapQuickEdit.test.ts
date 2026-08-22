import { describe, expect, it, vi } from 'vitest'
import { loadIconBitmapQuickEditTarget } from './iconBitmapQuickEdit'

describe('icon bitmap quick edit hydration', () => {
  it('loads a glyph missing from the current page and restores its stored recipe', async () => {
    const getGlyphByCode = vi.fn().mockResolvedValue({
      code: 0,
      data: { id: 8, glyphCode: 'weather-custom', fontType: 'weather_font' },
    })
    const getFontById = vi.fn().mockResolvedValue({
      code: 0,
      data: {
        id: 42,
        userId: 7,
        slug: 'weather-custom',
        type: 'weather_font',
        bitmapRecipe: '{"schemaVersion":1,"rendererVersion":"1","contentScale":0.72,"antialias":true}',
      },
    })

    await expect(loadIconBitmapQuickEditTarget({
      query: { fontId: '42', glyphCode: 'weather-custom', editBitmap: '1' },
      fontType: 'weather_font',
      currentUserId: 7,
      pageGlyphs: [],
      getGlyphByCode,
      getFontById,
    })).resolves.toEqual({
      glyph: { id: 8, glyphCode: 'weather-custom', fontType: 'weather_font' },
      recipe: { schemaVersion: 1, rendererVersion: '1', contentScale: 0.72, antialias: true },
    })
    expect(getGlyphByCode).toHaveBeenCalledWith('weather-custom')
    expect(getFontById).toHaveBeenCalledWith(42)
  })

  it('rejects mismatched font records instead of opening the wrong editor', async () => {
    await expect(loadIconBitmapQuickEditTarget({
      query: { fontId: '42', glyphCode: 'icons-a', editBitmap: '1' },
      fontType: 'icon_font',
      currentUserId: 7,
      pageGlyphs: [{ id: 8, glyphCode: 'icons-a', fontType: 'icon_font' } as any],
      getGlyphByCode: vi.fn(),
      getFontById: vi.fn().mockResolvedValue({ code: 0, data: { id: 42, slug: 'icons-b', type: 'icon_font' } }),
    })).rejects.toThrow('BITMAP_EDIT_FONT_MISMATCH')
  })

  it('rejects a font owned by another user', async () => {
    await expect(loadIconBitmapQuickEditTarget({
      query: { fontId: '42', glyphCode: 'icons-a', editBitmap: '1' },
      fontType: 'icon_font',
      currentUserId: 7,
      pageGlyphs: [{ id: 8, glyphCode: 'icons-a', fontType: 'icon_font' } as any],
      getGlyphByCode: vi.fn(),
      getFontById: vi.fn().mockResolvedValue({ code: 0, data: { id: 42, userId: 8, slug: 'icons-a', type: 'icon_font' } }),
    })).rejects.toThrow('BITMAP_EDIT_FONT_MISMATCH')
  })

  it('allows an admin to edit a system icon font owned by another user', async () => {
    await expect(loadIconBitmapQuickEditTarget({
      query: { fontId: '42', glyphCode: 'icons-a', editBitmap: '1' },
      fontType: 'icon_font',
      currentUserId: 7,
      currentUserIsAdmin: true,
      pageGlyphs: [{ id: 8, glyphCode: 'icons-a', fontType: 'icon_font' } as any],
      getGlyphByCode: vi.fn(),
      getFontById: vi.fn().mockResolvedValue({
        code: 0,
        data: { id: 42, userId: 99, slug: 'icons-a', type: 'icon_font', isSystem: 1 },
      }),
    })).resolves.toMatchObject({ glyph: { glyphCode: 'icons-a' } })
  })
})
