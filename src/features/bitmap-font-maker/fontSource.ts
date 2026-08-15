import opentype, { type Font, type FontNames, type LocalizedName } from 'opentype.js'
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

export function selectLocalizedName(values: LocalizedName | undefined): string | undefined {
  if (!values) return undefined
  const english = values.en?.trim()
  if (english) return english
  return Object.values(values)
    .map((value) => value.trim())
    .find((value) => value.length > 0)
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

type FontMetadataTables = Record<string, unknown>

function numericTableField(
  tables: FontMetadataTables,
  tableName: string,
  fieldName: string,
): number | undefined {
  const table = tables[tableName]
  if (!table || typeof table !== 'object') return undefined
  const value = (table as Record<string, unknown>)[fieldName]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function detectFontSourceItalic(
  tables: FontMetadataTables,
  subfamily: LocalizedName | undefined,
): boolean {
  const fsSelection = numericTableField(tables, 'os2', 'fsSelection')
  if (fsSelection !== undefined && (fsSelection & (0x01 | 0x0200)) !== 0) return true

  const macStyle = numericTableField(tables, 'head', 'macStyle')
  if (macStyle !== undefined && (macStyle & 0x02) !== 0) return true

  const italicAngle = numericTableField(tables, 'post', 'italicAngle')
  if (italicAngle !== undefined && italicAngle !== 0) return true

  const subfamilyName = selectLocalizedName(subfamily)
  return subfamilyName ? /italic|oblique/i.test(subfamilyName) : false
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
    // Keep owned source bytes for hashing/worker transfer; parse a separate buffer so
    // transferring either one later cannot detach the other.
    const bytes = new Uint8Array(await file.arrayBuffer())
    const parseBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer
    const font = opentype.parse(parseBuffer)
    const family = selectLocalizedName(font.names.fontFamily)
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
      sourceItalic: detectFontSourceItalic(font.tables, font.names.fontSubfamily),
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
