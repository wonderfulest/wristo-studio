import { Glyph, Path } from 'opentype.js'
import type { ParsedFontSource } from './fontSource'

export const DEGREE_CODEPOINT = 0x00b0

export function needsDegreeFallback(source: ParsedFontSource): boolean {
  if (!source.supportedCodepoints.has(DEGREE_CODEPOINT)) return true
  const glyph = source.font.charToGlyph('°')
  return glyph.index === 0 || glyph.path.commands.length === 0
}

/** A deterministic hollow degree sign in the source font's em and baseline. */
export function createDefaultDegreeGlyph(source: ParsedFontSource): Glyph {
  const em = source.unitsPerEm
  const radius = em * 0.125
  const centerX = em * 0.18
  const centerY = Math.min(source.ascender, em * 0.72) - radius
  const path = new Path()
  path.unitsPerEm = em
  for (const [r, direction] of [[radius, 1], [radius - em * 0.035, -1]]) {
    for (let step = 0; step < 64; step += 1) {
      const angle = direction * step * Math.PI / 32
      const x = centerX + r * Math.cos(angle)
      const y = centerY + r * Math.sin(angle)
      if (step === 0) path.moveTo(x, y)
      else path.lineTo(x, y)
    }
    path.close()
  }
  return new Glyph({ name: 'degree', unicode: DEGREE_CODEPOINT, index: 1, advanceWidth: em * 0.36, path })
}
