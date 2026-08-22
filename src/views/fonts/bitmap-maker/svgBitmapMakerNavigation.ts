import type { IconGlyphFontType } from '@/api/wristo/iconGlyph'

export function svgBitmapMakerLocation(fontType: IconGlyphFontType, glyphCode?: string) {
  return {
    name: 'BitmapFontMaker',
    query: {
      source: 'svg',
      fontType,
      ...(glyphCode ? { glyphCode } : {}),
    },
  }
}
