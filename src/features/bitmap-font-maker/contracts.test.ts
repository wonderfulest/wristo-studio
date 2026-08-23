import { describe, expect, it } from 'vitest'

import {
  BITMAP_FONT_SIZES,
  charsetForType,
  deriveBitmapFontSlug,
  mergeBitmapFontSearchKeywords,
  mergeBitmapFontStyleTags,
  normalizeBitmapFontRecipe,
} from './contracts'

const styledRecipe = {
  schemaVersion: 1 as const,
  rendererVersion: '1' as const,
  fontWeight: 900,
  italicAngle: -3,
  outlineWidthEm: 0.07,
  outlineMode: 'fill' as const,
  lineJoin: 'round' as const,
  antialias: true as const,
}

describe('bitmap font contracts', () => {
  it('derives a stable source-and-recipe slug and changes it when the rendered style changes', async () => {
    const sourceSha256 = 'a'.repeat(64)

    await expect(deriveBitmapFontSlug({
      baseName: 'Quantico',
      sourceSha256,
      fontType: 'time_font',
      recipe: styledRecipe,
    })).resolves.toBe('quantico-time-font-ec6c546f216e')

    await expect(deriveBitmapFontSlug({
      baseName: 'Quantico',
      sourceSha256,
      fontType: 'time_font',
      recipe: { ...styledRecipe, fontWeight: 800 },
    })).resolves.toBe('quantico-time-font-a6223da65e75')
  })

  it('merges recipe-derived tags with normalized manual tags without treating an unused outline width as outline', () => {
    expect(mergeBitmapFontStyleTags(styledRecipe, ' sport, Editorial, sport ')).toEqual([
      'bold',
      'italic',
      'fill',
      'sport',
      'editorial',
    ])
    expect(mergeBitmapFontStyleTags({ ...styledRecipe, outlineMode: 'fill-outline' }, ['sport'])).toEqual([
      'bold',
      'italic',
      'fill',
      'outline',
      'sport',
    ])
    expect(mergeBitmapFontStyleTags({ ...styledRecipe, fontWeight: 300, italicAngle: 0 }, [])).toEqual(['thin', 'fill'])
    expect(mergeBitmapFontStyleTags({ ...styledRecipe, fontWeight: 400, italicAngle: 0 }, [])).toEqual(['regular', 'fill'])
    expect(mergeBitmapFontStyleTags({ ...styledRecipe, fontWeight: 600, italicAngle: 0 }, [])).toEqual(['medium', 'fill'])
  })

  it('derives searchable comma-separated keywords from the font identity and style while preserving phrases', () => {
    const regularRecipe = { ...styledRecipe, fontWeight: 400, italicAngle: 0, outlineWidthEm: 0, outlineMode: 'fill' as const }

    expect(mergeBitmapFontSearchKeywords('Quantico', 'time_font', regularRecipe, ' sport editorial, Retro，retro ')).toEqual([
      'quantico',
      'number',
      'time',
      'bitmap',
      'regular',
      'fill',
      'sport editorial',
      'retro',
    ])
  })

  it('keeps the exact 38-size Wristo contract', () => {
    expect(BITMAP_FONT_SIZES).toHaveLength(38)
    expect(BITMAP_FONT_SIZES).toEqual([
      6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 21, 24, 30, 36, 42, 48, 54,
      60, 66, 72, 78, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204,
      216, 228, 240, 264, 288, 312,
    ])
  })

  it('maps only supported v1 font types', () => {
    expect(charsetForType('time_font').codepoints).toEqual([
      48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58,
    ])
    expect(charsetForType('text_font')).toEqual({
      profile: 'wristo-text-en-v1',
      codepoints: [
        32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
        48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63,
        64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79,
        80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95,
        96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
        110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122,
        123, 124, 125, 126,
        176, 8217, 8230,
      ],
    })
    expect(charsetForType('text_font').codepoints.filter(codepoint => codepoint === 45)).toHaveLength(1)
    expect(charsetForType('text_font').codepoints).not.toContain(8208)
    expect(charsetForType('text_font').codepoints).not.toContain(8211)
    const chinese = charsetForType('text_font_zh')
    expect(chinese.profile).toBe('wristo-text-zh-v1')
    expect(chinese.codepoints).toContain('中'.codePointAt(0))
    expect(chinese.codepoints).toContain('℃'.codePointAt(0))
    expect(new Set(chinese.codepoints).size).toBe(chinese.codepoints.length)
    expect(() => charsetForType('number_font')).toThrow('Unsupported bitmap font type')
    expect(() => charsetForType('data_font')).toThrow('Unsupported bitmap font type')
    expect(() => charsetForType('icon_font')).toThrow('Unsupported bitmap font type')
  })

  it('normalizes a bounded recipe', () => {
    expect(normalizeBitmapFontRecipe({
      schemaVersion: 1,
      rendererVersion: '1',
      fontWeight: 1200,
      italicAngle: -40,
      outlineWidthEm: -1,
      outlineMode: 'fill',
    })).toEqual({
      schemaVersion: 1,
      rendererVersion: '1',
      fontWeight: 900,
      italicAngle: -20,
      outlineWidthEm: 0,
      outlineMode: 'fill',
      lineJoin: 'round',
      antialias: true,
    })
  })

  it('uses canonical defaults for non-finite numeric values', () => {
    expect(normalizeBitmapFontRecipe({
      schemaVersion: 1,
      rendererVersion: '1',
      fontWeight: Number.NaN,
      italicAngle: Number.POSITIVE_INFINITY,
      outlineWidthEm: Number.NEGATIVE_INFINITY,
      outlineMode: 'fill-outline',
    })).toEqual({
      schemaVersion: 1,
      rendererVersion: '1',
      fontWeight: 400,
      italicAngle: 0,
      outlineWidthEm: 0,
      outlineMode: 'fill-outline',
      lineJoin: 'round',
      antialias: true,
    })
  })

  it('rejects unsupported recipe versions and outline modes at runtime', () => {
    const valid = {
      schemaVersion: 1,
      rendererVersion: '1',
      fontWeight: 400,
      italicAngle: 0,
      outlineWidthEm: 0,
      outlineMode: 'fill',
    }

    expect(() => normalizeBitmapFontRecipe({
      ...valid,
      schemaVersion: 2,
    } as unknown as Parameters<typeof normalizeBitmapFontRecipe>[0]))
      .toThrow('Unsupported bitmap font recipe schema version')
    expect(() => normalizeBitmapFontRecipe({
      ...valid,
      rendererVersion: '2',
    } as unknown as Parameters<typeof normalizeBitmapFontRecipe>[0]))
      .toThrow('Unsupported bitmap font renderer version')
    expect(() => normalizeBitmapFontRecipe({
      ...valid,
      outlineMode: 'shadow',
    } as unknown as Parameters<typeof normalizeBitmapFontRecipe>[0]))
      .toThrow('Unsupported bitmap font outline mode')
  })

  it('strips unknown fields from the canonical recipe', () => {
    const recipe = normalizeBitmapFontRecipe({
      schemaVersion: 1,
      rendererVersion: '1',
      fontWeight: 400,
      italicAngle: 0,
      outlineWidthEm: 0,
      outlineMode: 'outline-only',
      injected: 'not-canonical',
    } as unknown as Parameters<typeof normalizeBitmapFontRecipe>[0])

    expect(recipe).toEqual({
      schemaVersion: 1,
      rendererVersion: '1',
      fontWeight: 400,
      italicAngle: 0,
      outlineWidthEm: 0,
      outlineMode: 'outline-only',
      lineJoin: 'round',
      antialias: true,
    })
  })
})
