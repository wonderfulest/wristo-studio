export const canonicalFontSlug = (value: unknown): string =>
  String(value ?? '').trim().toLowerCase()
