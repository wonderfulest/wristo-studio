import { describe, expect, it } from 'vitest'
import { bmFontDescriptorFilename, writeBmFontText } from './bmFontWriter'

describe('writeBmFontText', () => {
  it('writes one deterministic Unicode page with sorted chars and kernings', () => {
    const text = writeBmFontText({
      slug: 'demo',
      face: 'A "quoted" face\\name',
      size: 24,
      lineHeight: 29,
      base: 22,
      scaleW: 64,
      scaleH: 32,
      chars: [
        { id: 66, x: 20, y: 0, width: 8, height: 10, xoffset: 1, yoffset: 2, xadvance: 9 },
        { id: 65, x: 0, y: 0, width: 9, height: 10, xoffset: 0, yoffset: 2, xadvance: 10 }
      ],
      kernings: [
        { first: 66, second: 65, amount: -1 },
        { first: 65, second: 66, amount: -2 }
      ]
    })

    expect(text).toContain('info face="A \\"quoted\\" face\\\\name" size=-24 unicode=1')
    expect(text).toContain('common lineHeight=29 base=22 scaleW=64 scaleH=32 pages=1')
    expect(text).toContain('page id=0 file="demo-g_0.png"')
    expect(text.indexOf('char id=65')).toBeLessThan(text.indexOf('char id=66'))
    expect(text.indexOf('kerning first=65')).toBeLessThan(text.indexOf('kerning first=66'))
    expect(text.endsWith('\n')).toBe(true)
  })

  it('emits every required codepoint and omits the kerning section when empty', () => {
    const text = writeBmFontText({
      slug: 'numbers',
      face: 'Fixture',
      size: 48,
      lineHeight: 50,
      base: 40,
      scaleW: 128,
      scaleH: 64,
      chars: [58, 48, 49].map((id) => ({ id, x: 0, y: 0, width: 1, height: 1, xoffset: 0, yoffset: 0, xadvance: 2 }))
    })

    expect(text).toContain('info face="Fixture" size=-48 unicode=1')
    expect(text).toContain('chars count=3')
    expect(text).toMatch(/char id=48[\s\S]*char id=49[\s\S]*char id=58/)
    expect(text).not.toContain('kernings count=')
  })

  it('rejects invalid pixel sizes instead of emitting ambiguous descriptors', () => {
    const input = {
      slug: 'numbers',
      face: 'Fixture',
      lineHeight: 50,
      base: 40,
      scaleW: 128,
      scaleH: 64,
      chars: []
    }
    for (const size of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => writeBmFontText({ ...input, size })).toThrowError(RangeError)
    }
  })

  it('uses the Wristo descriptor filename and rejects unsafe slugs', () => {
    expect(bmFontDescriptorFilename('roboto-outline')).toBe('roboto-outline-g.fnt')
    expect(() => bmFontDescriptorFilename('../roboto')).toThrowError(TypeError)
  })

  it('rejects face control characters and invalid common metrics', () => {
    const valid = {
      slug: 'safe',
      face: 'Fixture',
      size: 24,
      lineHeight: 30,
      base: 22,
      scaleW: 64,
      scaleH: 64,
      chars: [{ id: 65, x: 0, y: 0, width: 10, height: 10, xoffset: 0, yoffset: 0, xadvance: 11 }]
    }
    for (const face of ['bad\nface', 'bad\rface', 'bad\u0000face']) {
      expect(() => writeBmFontText({ ...valid, face })).toThrowError('BMFONT_INVALID_INPUT')
    }
    for (const change of [{ lineHeight: 1.5 }, { lineHeight: 8193 }, { base: -1 }, { scaleW: Number.NaN }, { scaleH: 0 }]) {
      expect(() => writeBmFontText({ ...valid, ...change })).toThrowError('BMFONT_INVALID_INPUT')
    }
  })

  it('rejects invalid or duplicate chars and out-of-atlas rectangles', () => {
    const base = { slug: 'safe', face: 'Fixture', size: 24, lineHeight: 30, base: 22, scaleW: 64, scaleH: 64 }
    const validChar = { id: 65, x: 0, y: 0, width: 10, height: 10, xoffset: 0, yoffset: 0, xadvance: 11 }
    for (const char of [
      { ...validChar, id: 0x110000 },
      { ...validChar, x: -1 },
      { ...validChar, width: 1.5 },
      { ...validChar, xadvance: Number.POSITIVE_INFINITY },
      { ...validChar, xoffset: 8193 },
      { ...validChar, x: 60, width: 10 }
    ]) {
      expect(() => writeBmFontText({ ...base, chars: [char] })).toThrowError('BMFONT_INVALID_INPUT')
    }
    expect(() => writeBmFontText({ ...base, chars: [validChar, validChar] })).toThrowError('BMFONT_INVALID_INPUT')
  })

  it('rejects duplicate, invalid, or dangling kerning pairs', () => {
    const chars = [65, 66].map((id) => ({ id, x: 0, y: 0, width: 1, height: 1, xoffset: 0, yoffset: 0, xadvance: 2 }))
    const base = { slug: 'safe', face: 'Fixture', size: 24, lineHeight: 30, base: 22, scaleW: 64, scaleH: 64, chars }
    expect(() => writeBmFontText({ ...base, kernings: [{ first: 65, second: 67, amount: -1 }] })).toThrowError('BMFONT_INVALID_INPUT')
    expect(() => writeBmFontText({ ...base, kernings: [{ first: 65, second: 66, amount: 0.5 }] })).toThrowError('BMFONT_INVALID_INPUT')
    expect(() =>
      writeBmFontText({
        ...base,
        kernings: [
          { first: 65, second: 66, amount: -1 },
          { first: 65, second: 66, amount: -2 }
        ]
      })
    ).toThrowError('BMFONT_INVALID_INPUT')
  })
})
