const normalizeFontType = (value: unknown) => String(value || '').trim().toLocaleLowerCase()

export const normalizeAllowedFontTypes = (types?: readonly string[], fallbackType?: string): string[] => {
  const source = types?.length ? types : fallbackType ? [fallbackType] : []
  return Array.from(new Set(source.map(normalizeFontType).filter(Boolean)))
}

export const isFontTypeVisible = (fontType: unknown, allowedTypes: readonly string[]): boolean => {
  if (!allowedTypes.length) return true

  const normalizedType = normalizeFontType(fontType)
  return !normalizedType || allowedTypes.includes(normalizedType)
}
