import type { BitmapFontRecipe } from './contracts'
import type { ParsedFontSource } from './fontSource'
import { renderGlyphs } from './glyphRenderer'
import { composeGlyphPixels, connectIqSafeHorizontalMetrics } from './packageBuilder'

export interface LiveGlyphPreviewGlyph {
  key: string
  codepoint: number
  left: number
  top: number
  width: number
  height: number
  rgba: Uint8ClampedArray
}

export interface LiveGlyphPreview {
  width: number
  lineHeight: number
  glyphs: LiveGlyphPreviewGlyph[]
}

const whiteRecipe = (recipe: BitmapFontRecipe): BitmapFontRecipe => ({
  ...recipe,
  gradientStartColor: '#ffffff',
  gradientEndColor: '#ffffff',
  gradientAngle: 90,
})

export function buildLiveGlyphPreview(
  source: ParsedFontSource,
  codepoints: number[],
  size: number,
  recipe: BitmapFontRecipe,
  gradientEnabled: boolean,
): LiveGlyphPreview {
  const rendered = renderGlyphs(source, [...new Set(codepoints)], size, recipe)
  const byCodepoint = new Map(rendered.glyphs.map(glyph => [glyph.codepoint, glyph]))
  const colorRecipe = gradientEnabled ? recipe : whiteRecipe(recipe)
  let cursor = 0
  let right = 0
  const glyphs = codepoints.flatMap((codepoint, index): LiveGlyphPreviewGlyph[] => {
    const glyph = byCodepoint.get(codepoint)
    if (!glyph) return []
    const metrics = connectIqSafeHorizontalMetrics(glyph)
    const pixels = composeGlyphPixels(glyph, colorRecipe)
    const left = cursor + metrics.xoffset
    cursor += metrics.xadvance
    right = Math.max(right, left + pixels.width, cursor)
    return [{
      key: `${codepoint}-${index}`,
      codepoint,
      left,
      top: glyph.yoffset,
      width: pixels.width,
      height: pixels.height,
      rgba: pixels.rgba,
    }]
  })
  return { width: Math.max(1, right), lineHeight: rendered.lineHeight, glyphs }
}
