const UNICODE_ESCAPE_RE = /^(?:\\u|U\+|0x)?([0-9a-fA-F]{4,6})$/

export const resolveIconGlyphText = (value: unknown): string => {
  const text = String(value ?? '').trim()
  if (!text) return ''

  const match = text.match(UNICODE_ESCAPE_RE)
  if (!match) return text

  const codePoint = Number.parseInt(match[1], 16)
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return text
  }

  try {
    return String.fromCodePoint(codePoint)
  } catch {
    return text
  }
}
