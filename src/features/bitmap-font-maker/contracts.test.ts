import { describe, expect, it } from 'vitest'

import {
  BITMAP_FONT_SIZES,
  charsetForType,
  normalizeBitmapFontRecipe,
} from './contracts'

describe('bitmap font contracts', () => {
  it('keeps the exact 38-size Wristo contract', () => {
    expect(BITMAP_FONT_SIZES).toHaveLength(38)
    expect(BITMAP_FONT_SIZES).toEqual([
      6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 21, 24, 30, 36, 42, 48, 54,
      60, 66, 72, 78, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204,
      216, 228, 240, 264, 288, 312,
    ])
  })

  it('maps only supported v1 font types', () => {
    expect(charsetForType('number_font').codepoints).toEqual([
      48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 176,
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
        176, 8208, 8211, 8217, 8230,
      ],
    })
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
