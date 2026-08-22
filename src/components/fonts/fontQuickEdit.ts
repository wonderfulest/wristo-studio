export const QUICK_EDIT_FONT_TYPES = [
  'number_font',
  'text_font',
  'text_font_zh',
  'icon_font',
  'weather_font',
] as const

export type QuickEditFontType = typeof QUICK_EDIT_FONT_TYPES[number]

export interface QuickEditFontIdentity {
  id: number
  type: string
  slug: string
}

export interface QuickEditVisibilityInput {
  ownerUserId?: number
  currentUserId?: number
  currentUserIsAdmin?: boolean
  isSystem: boolean
  type: string
}

export function isQuickEditFontType(type: string): type is QuickEditFontType {
  return (QUICK_EDIT_FONT_TYPES as readonly string[]).includes(type)
}

export function canQuickEditFont(input: QuickEditVisibilityInput): boolean {
  if (!isQuickEditFontType(input.type)) return false
  if (input.currentUserIsAdmin && (input.type === 'icon_font' || input.type === 'weather_font')) return true
  return !input.isSystem && input.currentUserId != null && input.ownerUserId === input.currentUserId
}

export function resolveFontQuickEditLocation(font: QuickEditFontIdentity) {
  if (!isQuickEditFontType(font.type)) return null

  if (font.type === 'icon_font' || font.type === 'weather_font') {
    return {
      name: font.type === 'weather_font' ? 'WeatherFontLibrary' : 'IconLibrary',
      query: {
        fontId: String(font.id),
        glyphCode: font.slug,
        editBitmap: '1',
      },
    }
  }

  return {
    name: 'BitmapFontMaker',
    query: {
      fontId: String(font.id),
      fontType: font.type,
    },
  }
}
