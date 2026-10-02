import { describe, expect, it } from 'vitest'
import { baselinePadding, baselineRise, baselineSlope } from './baselineLayout'
import { normalizeBitmapFontRecipe } from './contracts'
import { parseBitmapFontRecipe, recipeToCssPreviewStyle } from './recipePreview'
import { writeBmFontText } from './bmFontWriter'
import { parseBmFontText } from '../bitmap-font-preview/bmFontTextParser'

const recipe = { schemaVersion: 1 as const, rendererVersion: '1' as const, fontWeight: 400, italicAngle: 0, outlineWidthEm: 0, outlineMode: 'fill' as const, lineJoin: 'round' as const, antialias: true as const }
describe('baseline angle contract', () => {
  it('keeps the old identity at zero and normalizes the independent angle', () => {
    expect(normalizeBitmapFontRecipe({ ...recipe, baselineAngle: 0 })).toEqual(normalizeBitmapFontRecipe(recipe))
    expect(normalizeBitmapFontRecipe({ ...recipe, baselineAngle: 99, italicAngle: -12 })).toMatchObject({ baselineAngle: 20, italicAngle: -12 })
    expect(parseBitmapFontRecipe(normalizeBitmapFontRecipe({ ...recipe, baselineAngle: 12 }))).toMatchObject({ baselineAngle: 12 })
    for (const baselineAngle of [NaN, Infinity, 21, -21, '12']) expect(parseBitmapFontRecipe({ ...recipe, baselineAngle })).toBeNull()
    expect(recipeToCssPreviewStyle({ ...recipe, baselineAngle: 12 })?.transform).toContain('skewY(-12deg)')
  })
  it('centers either slope and reserves enough space', () => {
    expect(baselineSlope()).toBe(0)
    expect(baselineRise(12, 0, 20, 100)).toBeGreaterThan(0)
    expect(baselineRise(12, 80, 20, 100)).toBeLessThan(0)
    expect(baselinePadding(-12, 100)).toBe(baselinePadding(12, 100))
  })
  it('round-trips the angle in the portable font descriptor', () => {
    const descriptor = writeBmFontText({ slug: 'test', face: 'Test', size: 30, baselineAngle: -12, lineHeight: 30, base: 24, scaleW: 16, scaleH: 16, chars: [{ id: 65, x: 0, y: 0, width: 10, height: 10, xoffset: 0, yoffset: 0, xadvance: 10 }] })
    expect(parseBmFontText(descriptor).baselineAngle).toBe(-12)
    expect(() => parseBmFontText(descriptor.replace('baselineAngle=-12', 'baselineAngle=NaN'))).toThrow()
  })
})
