import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  FONT_SOURCE_MAX_BYTES,
  FontSourceError,
  checkRequiredGlyphs,
  parseFontSource,
} from './fontSource'

const fixtureUrl = new URL('./__fixtures__/minimal-latin.ttf', import.meta.url)

async function fixtureFile(name = 'minimal-latin.ttf'): Promise<File> {
  const bytes = await readFile(fileURLToPath(fixtureUrl))
  return new File([bytes], name, { type: 'font/ttf' })
}

describe('parseFontSource', () => {
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

  it('accepts case-insensitive TTF and OTF file extensions', async () => {
    await expect(parseFontSource(await fixtureFile('font.TTF'))).resolves.toBeDefined()
    await expect(parseFontSource(await fixtureFile('font.OtF'))).resolves.toBeDefined()
  })

  it('rejects unsupported file extensions with a stable error code', async () => {
    await expect(parseFontSource(await fixtureFile('font.woff2'))).rejects.toMatchObject({
      code: 'FONT_SOURCE_UNSUPPORTED_FORMAT',
    })
  })

  it('rejects files larger than 20 MiB while defining the boundary as inclusive', async () => {
    expect(FONT_SOURCE_MAX_BYTES).toBe(20 * 1024 * 1024)
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
