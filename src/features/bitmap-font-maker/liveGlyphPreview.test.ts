import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { normalizeBitmapFontRecipe } from './contracts'
import { parseFontSource } from './fontSource'
import { buildLiveGlyphPreview } from './liveGlyphPreview'

const fixtureUrl = new URL('./__fixtures__/minimal-latin.ttf', import.meta.url)

const recipe = (outlineMode: 'fill' | 'fill-outline' | 'outline-only') => normalizeBitmapFontRecipe({
  schemaVersion: 1,
  rendererVersion: '1',
  fontWeight: 400,
  italicAngle: 0,
  outlineWidthEm: 0.04,
  outlineMode,
  gradientStartColor: '#ff0000',
  gradientEndColor: '#0000ff',
  gradientAngle: 90,
})

describe('buildLiveGlyphPreview', () => {
  it('uses the bottom renderer modes, per-glyph gradient pixels, and safe advances', async () => {
    const bytes = await readFile(fileURLToPath(fixtureUrl))
    const source = await parseFontSource(new File([bytes], 'minimal-latin.ttf'))

    const fill = buildLiveGlyphPreview(source, [79, 79], 120, recipe('fill'), true)
    const fillOutline = buildLiveGlyphPreview(source, [79, 79], 120, recipe('fill-outline'), true)
    const outlineOnly = buildLiveGlyphPreview(source, [79, 79], 120, recipe('outline-only'), true)

    expect(fillOutline.glyphs[0].width).toBeGreaterThan(fill.glyphs[0].width)
    expect(outlineOnly.glyphs[0].rgba.filter((_, index) => index % 4 === 3 && outlineOnly.glyphs[0].rgba[index] > 0).length)
      .toBeLessThan(fillOutline.glyphs[0].rgba.filter((_, index) => index % 4 === 3 && fillOutline.glyphs[0].rgba[index] > 0).length)
    expect(Array.from(fillOutline.glyphs[0].rgba.slice(0, 3))).toEqual([255, 0, 0])
    const lastPixel = fillOutline.glyphs[0].rgba.length - 4
    expect(Array.from(fillOutline.glyphs[0].rgba.slice(lastPixel, lastPixel + 3))).toEqual([0, 0, 255])
    expect(fillOutline.glyphs[1].left).toBeGreaterThanOrEqual(fillOutline.glyphs[0].left + fillOutline.glyphs[0].width)
    expect(fillOutline.width).toBeGreaterThanOrEqual(fillOutline.glyphs[1].left + fillOutline.glyphs[1].width)
  })
})
