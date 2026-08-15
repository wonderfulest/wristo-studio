export const BITMAP_FONT_SIZES = Object.freeze([
  6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 21, 24, 30, 36, 42, 48, 54,
  60, 66, 72, 78, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204,
  216, 228, 240, 264, 288, 312,
] as const)

export type BitmapFontType = 'number_font' | 'text_font'
export type OutlineMode = 'fill' | 'fill-outline' | 'outline-only'

export interface BitmapFontRecipe {
  schemaVersion: 1
  rendererVersion: '1'
  fontWeight: number
  italicAngle: number
  outlineWidthEm: number
  outlineMode: OutlineMode
  lineJoin: 'round'
  antialias: true
}

export interface BitmapFontManifest {
  schemaVersion: 1
  slug: string
  type: BitmapFontType
  language: 'en'
  source: { fileName: string; sha256: string }
  sizes: number[]
  charset: { profile: string; codepoints: number[] }
  recipeSha256: string
  packageContentSha256: string
}

export interface BitmapFontCharset {
  profile: string
  codepoints: number[]
}

type BitmapFontRecipeInput = Omit<BitmapFontRecipe, 'lineJoin' | 'antialias'> &
  Partial<Pick<BitmapFontRecipe, 'lineJoin' | 'antialias'>>

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value))

const finiteOrDefault = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback

export function charsetForType(type: BitmapFontType | string): BitmapFontCharset {
  if (type === 'number_font') {
    return {
      profile: 'wristo-number-v1',
      codepoints: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 176],
    }
  }

  if (type === 'text_font') {
    return {
      profile: 'wristo-text-en-v1',
      codepoints: [
        ...Array.from({ length: 95 }, (_, index) => 32 + index),
        176, 8208, 8211, 8217, 8230,
      ],
    }
  }

  throw new Error(`Unsupported bitmap font type: ${type}`)
}

export function normalizeBitmapFontRecipe(input: BitmapFontRecipeInput): BitmapFontRecipe {
  if (input.schemaVersion !== 1) {
    throw new Error(`Unsupported bitmap font recipe schema version: ${input.schemaVersion}`)
  }
  if (input.rendererVersion !== '1') {
    throw new Error(`Unsupported bitmap font renderer version: ${input.rendererVersion}`)
  }
  if (!(['fill', 'fill-outline', 'outline-only'] as const).includes(input.outlineMode)) {
    throw new Error(`Unsupported bitmap font outline mode: ${input.outlineMode}`)
  }

  return {
    schemaVersion: 1,
    rendererVersion: '1',
    fontWeight: clamp(finiteOrDefault(input.fontWeight, 400), 100, 900),
    italicAngle: clamp(finiteOrDefault(input.italicAngle, 0), -20, 20),
    outlineWidthEm: clamp(finiteOrDefault(input.outlineWidthEm, 0), 0, 0.5),
    outlineMode: input.outlineMode,
    lineJoin: 'round',
    antialias: true,
  }
}
