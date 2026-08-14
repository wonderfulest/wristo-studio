import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { normalizeBitmapFontRecipe } from './contracts'
import { parseFontSource } from './fontSource'
import { GlyphRenderError, registerUploadedFontFace, renderGlyphs } from './glyphRenderer'

const fixtureUrl = new URL('./__fixtures__/minimal-latin.ttf', import.meta.url)

async function source() {
  const bytes = await readFile(fileURLToPath(fixtureUrl))
  return parseFontSource(new File([bytes], 'minimal-latin.ttf'))
}

const recipe = (changes: Partial<Parameters<typeof normalizeBitmapFontRecipe>[0]> = {}) =>
  normalizeBitmapFontRecipe({
    schemaVersion: 1,
    rendererVersion: '1',
    fontWeight: 400,
    italicAngle: 0,
    outlineWidthEm: 0,
    outlineMode: 'fill',
    ...changes
  })

describe('renderGlyphs', () => {
  it('renders uploaded glyph alpha and preserves space advance against one baseline', async () => {
    const result = renderGlyphs(await source(), [32, 65], 48, recipe())
    const letter = result.glyphs.find((glyph) => glyph.codepoint === 65)!
    const space = result.glyphs.find((glyph) => glyph.codepoint === 32)!

    expect(letter.alpha.some((alpha) => alpha > 0)).toBe(true)
    const rows = Array.from({ length: letter.height }, (_, y) => letter.alpha.slice(y * letter.width, (y + 1) * letter.width))
    expect(rows[0].some((alpha) => alpha > 0)).toBe(true)
    expect(rows.at(-1)!.some((alpha) => alpha > 0)).toBe(true)
    expect(space.xadvance).toBeGreaterThan(0)
    expect(result.baseline).toBeGreaterThan(0)
    expect(result.diagnostics).toEqual({ rendererPath: 'opentype-path', rendererVersion: '1' })
  })

  it('expands bounds for outline and shears horizontal bounds for italic', async () => {
    const parsed = await source()
    const plain = renderGlyphs(parsed, [65], 64, recipe()).glyphs[0]
    const outlined = renderGlyphs(parsed, [65], 64, recipe({ outlineWidthEm: 0.08, outlineMode: 'fill-outline' })).glyphs[0]
    const uprightStem = renderGlyphs(parsed, [73], 64, recipe()).glyphs[0]
    const italic = renderGlyphs(parsed, [73], 64, recipe({ italicAngle: 14 })).glyphs[0]

    expect(outlined.width).toBeGreaterThan(plain.width)
    expect(outlined.height).toBeGreaterThan(plain.height)
    expect([italic.width, italic.xoffset]).not.toEqual([uprightStem.width, uprightStem.xoffset])
  })

  it('applies synthetic weight and supports outline-only alpha', async () => {
    const parsed = await source()
    const regular = renderGlyphs(parsed, [79], 64, recipe()).glyphs[0]
    const bold = renderGlyphs(parsed, [79], 64, recipe({ fontWeight: 700 })).glyphs[0]
    const outlineOnly = renderGlyphs(parsed, [79], 64, recipe({ outlineWidthEm: 0.06, outlineMode: 'outline-only' })).glyphs[0]

    const coverage = (alpha: Uint8Array) => alpha.filter((value) => value > 0).length
    expect(coverage(bold.alpha)).toBeGreaterThan(coverage(regular.alpha))
    expect(coverage(outlineOnly.alpha)).toBeGreaterThan(0)
    expect(coverage(outlineOnly.alpha)).toBeLessThan(outlineOnly.width * outlineOnly.height)
  })

  it('rejects a missing uploaded-font glyph with a stable error', async () => {
    const parsed = await source()
    expect(() => renderGlyphs(parsed, [0x4e2d], 32, recipe())).toThrowError(expect.objectContaining<Partial<GlyphRenderError>>({ code: 'GLYPH_MISSING' }))
  })

  it('does not claim a FontFace renderer when worker font APIs are unavailable', async () => {
    expect(await registerUploadedFontFace(await source(), 700, {})).toBeUndefined()
  })
})
