import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  FONT_SOURCE_MAX_BYTES,
  FontSourceError,
  checkRequiredGlyphs,
  detectFontSourceItalic,
  parseFontSource,
  selectLocalizedName,
} from './fontSource'

import { BITMAP_FONT_SIZES, normalizeBitmapFontRecipe } from './contracts'
import { renderGlyphs } from './glyphRenderer'
import { writeBmFontText } from './bmFontWriter'

const fixtureUrl = new URL('./__fixtures__/minimal-latin.ttf', import.meta.url)

async function fixtureFile(name = 'minimal-latin.ttf'): Promise<File> {
  const bytes = await readFile(fileURLToPath(fixtureUrl))
  return new File([bytes], name, { type: 'font/ttf' })
}

describe('parseFontSource', () => {
  it('exports valid metrics for fonts with a positive hhea descender without altering source bytes', async () => {
    const bytes = await readFile(fileURLToPath(fixtureUrl))
    for (let i = 0; i < bytes.readUInt16BE(4); i++) {
      const entry = 12 + i * 16
      if (bytes.toString('ascii', entry, entry + 4) === 'hhea') {
        const offset = bytes.readUInt32BE(entry + 8)
        bytes.writeInt16BE(750, offset + 4)
        bytes.writeInt16BE(250, offset + 6)
      }
    }
    const source = await parseFontSource(new File([bytes], 'positive-descender.ttf'))
    const recipe = normalizeBitmapFontRecipe({ schemaVersion: 1, rendererVersion: '1', fontWeight: 400, italicAngle: 0, outlineWidthEm: 0, outlineMode: 'fill' })
    for (const size of BITMAP_FONT_SIZES) {
      const rendered = renderGlyphs(source, [65], size, recipe)
      expect(() => writeBmFontText({ slug: 'positive-descender', face: source.family, size, lineHeight: rendered.lineHeight, base: rendered.baseline, scaleW: 1, scaleH: 1, chars: [] })).not.toThrow()
      if (size === 48) expect(rendered).toMatchObject({ lineHeight: 48, baseline: 36 })
    }
    expect(source.bytes).toEqual(new Uint8Array(bytes))
    expect(source.font.descender).toBe(250)
  })

  it('extracts font metadata and every required Latin fixture glyph', async () => {
    const source = await parseFontSource(await fixtureFile())

    expect(source.family).toBe('Noto Sans')
    expect(source.names.fontFamily?.en).toBe('Noto Sans')
    expect(source.unitsPerEm).toBe(1000)
    expect(source.ascender).toBeGreaterThan(0)
    expect(source.descender).toBeLessThan(0)
    expect(source.glyphCount).toBeGreaterThan(0)
    expect(source.sourceWeight).toBe(400)
    expect(source.sourceItalic).toBe(false)
    expect(source.bytes.byteLength).toBeGreaterThan(0)
    expect(source.font).toBeDefined()
    expect(source.supportedCodepoints.has(58)).toBe(true)

    for (const codepoint of [0x00b0, 0x2010, 0x2013, 0x2019, 0x2026]) {
      expect(source.supportedCodepoints.has(codepoint), `U+${codepoint.toString(16)}`).toBe(true)
    }
  })

  it('reports required glyphs missing from the uploaded font without system fallback', async () => {
    const source = await parseFontSource(await fixtureFile())

    expect(
      checkRequiredGlyphs(source, {
        profile: 'test',
        codepoints: [65, 0x4e2d],
      }),
    ).toEqual({ profile: 'test', missing: [0x4e2d] })
  })

  it('allows a missing degree symbol to use the built-in fallback while rejecting other missing glyphs', async () => {
    const source = await parseFontSource(await fixtureFile())
    source.supportedCodepoints.delete(176)
    expect(checkRequiredGlyphs(source, { profile: 'test', codepoints: [176, 0x4e2d] }).missing).toEqual([0x4e2d])
    expect(source.supportedCodepoints.has(176)).toBe(false)
  })

  it('treats the supported filename extensions case-insensitively', async () => {
    await expect(parseFontSource(await fixtureFile('font.TTF'))).resolves.toBeDefined()
    await expect(parseFontSource(await fixtureFile('font.OtF'))).resolves.toBeDefined()
  })

  it('rejects unsupported file extensions with a stable error code', async () => {
    await expect(parseFontSource(await fixtureFile('font.woff2'))).rejects.toMatchObject({
      code: 'FONT_SOURCE_UNSUPPORTED_FORMAT',
    })
  })

  it('accepts a valid font whose file size is exactly 20 MiB', async () => {
    expect(FONT_SOURCE_MAX_BYTES).toBe(20 * 1024 * 1024)
    const fixture = await readFile(fileURLToPath(fixtureUrl))
    const boundary = new File(
      [fixture, new Uint8Array(FONT_SOURCE_MAX_BYTES - fixture.byteLength)],
      'boundary.ttf',
    )

    const source = await parseFontSource(boundary)

    expect(boundary.size).toBe(FONT_SOURCE_MAX_BYTES)
    expect(source.family).toBe('Noto Sans')
    expect(source.supportedCodepoints.has(65)).toBe(true)
  })

  it('rejects files larger than 20 MiB', async () => {
    const oversized = new File([new Uint8Array(FONT_SOURCE_MAX_BYTES + 1)], 'large.ttf')

    await expect(parseFontSource(oversized)).rejects.toMatchObject({
      code: 'FONT_SOURCE_TOO_LARGE',
    })
  })

  it('normalizes parser failures as FONT_SOURCE_INVALID', async () => {
    const invalid = new File([new Uint8Array([0, 1, 2, 3])], 'broken.ttf')

    await expect(parseFontSource(invalid)).rejects.toEqual(
      expect.objectContaining({
        code: 'FONT_SOURCE_INVALID',
        message: expect.stringContaining('FONT_SOURCE_INVALID'),
      }),
    )
  })

  it('exposes typed font source errors', () => {
    const error = new FontSourceError('FONT_SOURCE_INVALID', 'bad font')

    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe('FONT_SOURCE_INVALID')
  })
})

describe('font metadata helpers', () => {
  it.each([
    { tables: { os2: { fsSelection: 0x01 } }, label: 'OS/2 italic' },
    { tables: { os2: { fsSelection: 0x0200 } }, label: 'OS/2 oblique' },
    { tables: { head: { macStyle: 0x02 } }, label: 'head italic' },
  ])('recognizes $label flags without relying on style names', ({ tables }) => {
    expect(detectFontSourceItalic(tables, {})).toBe(true)
  })

  it('uses post angle and subfamily only after formal flags', () => {
    expect(detectFontSourceItalic({ post: { italicAngle: -12 } }, {})).toBe(true)
    expect(detectFontSourceItalic({}, { en: 'Regular', fr: 'Oblique' })).toBe(false)
    expect(detectFontSourceItalic({}, { en: 'Italic' })).toBe(true)
  })

  it('trims localized names and skips an empty English value', () => {
    expect(selectLocalizedName({ en: '   ', fr: '  Famille  ' })).toBe('Famille')
  })
})
