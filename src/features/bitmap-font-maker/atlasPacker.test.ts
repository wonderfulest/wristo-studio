import { describe, expect, it } from 'vitest'
import { AtlasPackingError, packGlyphAtlas } from './atlasPacker'

describe('packGlyphAtlas', () => {
  const glyphs = [
    { codepoint: 66, width: 19, height: 25 },
    { codepoint: 65, width: 23, height: 20 },
    { codepoint: 67, width: 9, height: 11 }
  ]

  it('packs deterministic non-overlapping placements in a single bounded atlas', () => {
    const first = packGlyphAtlas(glyphs, { padding: 2 })
    const second = packGlyphAtlas([...glyphs].reverse(), { padding: 2 })

    expect(second).toEqual(first)
    expect(first.width).toBeLessThanOrEqual(8192)
    expect(first.height).toBeLessThanOrEqual(8192)
    for (let index = 0; index < first.placements.length; index += 1) {
      for (let other = index + 1; other < first.placements.length; other += 1) {
        const a = first.placements[index]
        const b = first.placements[other]
        expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true)
      }
    }
  })

  it('evaluates exact-fit and power-of-two candidates', () => {
    const exact = packGlyphAtlas([{ codepoint: 65, width: 30, height: 17 }], { padding: 0 })
    const powerOfTwo = packGlyphAtlas([{ codepoint: 65, width: 30, height: 17 }], {
      padding: 0,
      powerOfTwo: true
    })

    expect(exact).toMatchObject({ width: 30, height: 17 })
    expect(powerOfTwo).toMatchObject({ width: 32, height: 32 })
  })

  it('fails with ATLAS_TOO_LARGE instead of creating another page', () => {
    expect(() => packGlyphAtlas([{ codepoint: 65, width: 8193, height: 1 }], { padding: 0 })).toThrowError(expect.objectContaining<Partial<AtlasPackingError>>({ code: 'ATLAS_TOO_LARGE' }))
  })
})
