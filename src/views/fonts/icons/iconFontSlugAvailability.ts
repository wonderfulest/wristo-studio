import { getIconGlyphByCode, type IconGlyphVO } from '@/api/wristo/iconGlyph'

type IconFontSlugLookup = (
  slug: string,
) => Promise<{ data?: Pick<IconGlyphVO, 'id' | 'glyphCode'> | null }>

export const hasIconFontSlugConflict = async (
  slug: string,
  originalSlug = '',
  lookup: IconFontSlugLookup = getIconGlyphByCode,
): Promise<boolean> => {
  if (slug === originalSlug) return false
  const { data } = await lookup(slug)
  return !!data
}
