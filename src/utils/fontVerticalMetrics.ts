export const FABRIC_FONT_SIZE_MULT = 1.13
export const FABRIC_FONT_SIZE_FRACTION = 0.222

export function fabricBaselineOffset(fontSize: number): number {
  return fontSize * FABRIC_FONT_SIZE_MULT * (0.5 - FABRIC_FONT_SIZE_FRACTION)
}

interface VerticalGlyphMetrics {
  codepoint: number
  height: number
  yoffset: number
}

export function connectIqDrawOffsetY(
  fontSize: number,
  lineHeight: number,
  baseline: number,
  glyphs: VerticalGlyphMetrics[],
): number {
  const hasDigits = glyphs.some(
    (glyph) => glyph.codepoint >= 48 && glyph.codepoint <= 57 && glyph.height > 0,
  )
  if (!hasDigits) return 0

  // Studio's BMFont preview centers the complete line-height box on the
  // Fabric object's top. Connect IQ anchors the same box at its baseline.
  // Align those box origins; yoffset then places every glyph identically.
  return Math.round(baseline - lineHeight / 2 - fabricBaselineOffset(fontSize))
}
