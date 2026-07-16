export const MAX_ICON_FONT_SLUG_LENGTH = 64

export const normalizeIconFontSlug = (value: unknown): string => {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, MAX_ICON_FONT_SLUG_LENGTH)
    .replace(/-+$/g, '')
}
