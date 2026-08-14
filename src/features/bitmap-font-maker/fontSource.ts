import type { Font, FontNames, LocalizedName } from 'opentype.js'
// opentype.js ships this browser-safe ESM build without a matching declaration entry.
// @ts-expect-error The runtime API is typed by the adjacent opentype.js type imports.
import opentype from 'opentype.js/dist/opentype.module.js'
import type { BitmapFontCharset } from './contracts'

export const FONT_SOURCE_MAX_BYTES = 20 * 1024 * 1024

export type FontSourceErrorCode =
  | 'FONT_SOURCE_TOO_LARGE'
  | 'FONT_SOURCE_UNSUPPORTED_FORMAT'
  | 'FONT_SOURCE_INVALID'

export class FontSourceError extends Error {
  readonly code: FontSourceErrorCode

  constructor(code: FontSourceErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'FontSourceError'
    this.code = code
  }
}

export interface ParsedFontSource {
  bytes: Uint8Array
  names: FontNames
  family: string
  unitsPerEm: number
  ascender: number
  descender: number
  glyphCount: number
  sourceWeight: number
  sourceItalic: boolean
  supportedCodepoints: Set<number>
  font: Font
}

export interface RequiredGlyphCheck {
  profile: string
  missing: number[]
}

function englishOrFirst(values: LocalizedName | undefined): string | undefined {
  if (!values) return undefined
  return values.en ?? Object.values(values).find((value) => value.length > 0)
}

function buildSupportedCodepoints(font: Font): Set<number> {
  const codepoints = new Set<number>()

  for (let index = 0; index < font.glyphs.length; index += 1) {
    const glyph = font.glyphs.get(index)
    if (glyph.unicode !== undefined) codepoints.add(glyph.unicode)
    for (const unicode of glyph.unicodes) codepoints.add(unicode)
  }

  return codepoints
}

function sourceWeight(font: Font): number {
  const os2 = font.tables.os2 as { usWeightClass?: unknown } | undefined
  return typeof os2?.usWeightClass === 'number' ? os2.usWeightClass : 400
}

function sourceItalic(font: Font): boolean {
  const post = font.tables.post as { italicAngle?: unknown } | undefined
  if (typeof post?.italicAngle === 'number' && post.italicAngle !== 0) return true

  const subfamily = englishOrFirst(font.names.fontSubfamily)
  return subfamily ? /italic|oblique/i.test(subfamily) : false
}

export async function parseFontSource(file: File): Promise<ParsedFontSource> {
  if (!/\.(?:ttf|otf)$/i.test(file.name)) {
    throw new FontSourceError(
      'FONT_SOURCE_UNSUPPORTED_FORMAT',
      'Only local .ttf and .otf files are supported',
    )
  }
  if (file.size > FONT_SOURCE_MAX_BYTES) {
    throw new FontSourceError('FONT_SOURCE_TOO_LARGE', 'The maximum size is 20 MiB')
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const parseBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer
    const font = opentype.parse(parseBuffer)
    const family = englishOrFirst(font.names.fontFamily)
    if (!family) throw new Error('Font family metadata is missing')

    return {
      bytes,
      names: font.names,
      family,
      unitsPerEm: font.unitsPerEm,
      ascender: font.ascender,
      descender: font.descender,
      glyphCount: font.glyphs.length,
      sourceWeight: sourceWeight(font),
      sourceItalic: sourceItalic(font),
      supportedCodepoints: buildSupportedCodepoints(font),
      font,
    }
  } catch (error) {
    if (error instanceof FontSourceError) throw error
    const detail = error instanceof Error ? error.message : 'Unable to parse font data'
    throw new FontSourceError('FONT_SOURCE_INVALID', detail)
  }
}

export function checkRequiredGlyphs(
  source: ParsedFontSource,
  charset: BitmapFontCharset,
): RequiredGlyphCheck {
  return {
    profile: charset.profile,
    missing: [...new Set(charset.codepoints)].filter(
      (codepoint) => !source.supportedCodepoints.has(codepoint),
    ),
  }
}
