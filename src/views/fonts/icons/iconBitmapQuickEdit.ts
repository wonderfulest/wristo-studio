import type { ApiResponse } from '@/types/api/api'
import type { DesignFontVO } from '@/types/font'
import type { IconGlyphFontType, IconGlyphVO } from '@/api/wristo/iconGlyph'
import type { WeatherBitmapFontRecipe } from '@/features/bitmap-font-maker/weatherPackageBuilder'

type QueryValue = string | Array<string | null> | null | undefined

export interface IconBitmapQuickEditInput {
  query: Record<string, QueryValue>
  fontType: IconGlyphFontType
  currentUserId?: number
  currentUserIsAdmin?: boolean
  pageGlyphs: IconGlyphVO[]
  getGlyphByCode: (glyphCode: string) => Promise<ApiResponse<IconGlyphVO>>
  getFontById: (fontId: number) => Promise<ApiResponse<DesignFontVO>>
}

export interface IconBitmapQuickEditTarget {
  glyph: IconGlyphVO
  recipe: WeatherBitmapFontRecipe
}

const first = (value: QueryValue): string => Array.isArray(value) ? (value[0] || '') : (value || '')

const parseRecipe = (value: unknown): WeatherBitmapFontRecipe => {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  const recipe = parsed as Partial<WeatherBitmapFontRecipe> | null
  if (!recipe
    || recipe.schemaVersion !== 1
    || recipe.rendererVersion !== '1'
    || recipe.antialias !== true
    || typeof recipe.contentScale !== 'number'
    || recipe.contentScale < 0.5
    || recipe.contentScale > 1) {
    return { schemaVersion: 1, rendererVersion: '1', contentScale: 0.88, antialias: true }
  }
  return { schemaVersion: 1, rendererVersion: '1', contentScale: recipe.contentScale, antialias: true }
}

export async function loadIconBitmapQuickEditTarget(input: IconBitmapQuickEditInput): Promise<IconBitmapQuickEditTarget | null> {
  if (first(input.query.editBitmap) !== '1') return null
  const fontId = Number(first(input.query.fontId))
  const glyphCode = first(input.query.glyphCode)
  if (!Number.isSafeInteger(fontId) || fontId <= 0 || !glyphCode) throw new Error('BITMAP_EDIT_QUERY_INVALID')

  let glyph = input.pageGlyphs.find(item => item.glyphCode === glyphCode)
  if (!glyph) glyph = (await input.getGlyphByCode(glyphCode)).data
  if (!glyph || glyph.glyphCode !== glyphCode || glyph.fontType !== input.fontType) {
    throw new Error('BITMAP_EDIT_GLYPH_MISMATCH')
  }

  const font = (await input.getFontById(fontId)).data
  const canEditFont = font && (font.userId === input.currentUserId || (input.currentUserIsAdmin && font.isSystem === 1))
  if (!font || font.id !== fontId || !canEditFont || font.slug !== glyphCode || font.type !== input.fontType) {
    throw new Error('BITMAP_EDIT_FONT_MISMATCH')
  }

  return { glyph, recipe: parseRecipe(font.bitmapRecipe) }
}
