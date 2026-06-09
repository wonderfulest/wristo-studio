// Typography related options

export const fontSizes: number[] = [
  6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72,
  78, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204, 216, 228, 240, 264,
  288, 312,
]

export const normalizeFontSizeToOption = (fontSize: unknown, fallback = 36): number => {
  const value = typeof fontSize === 'number' ? fontSize : Number(fontSize)
  if (!Number.isFinite(value)) {
    return normalizeFontSizeToOption(fallback, fontSizes[0])
  }

  const roundedValue = Math.round(value)
  if (fontSizes.includes(roundedValue)) {
    return roundedValue
  }

  return fontSizes.reduce((best, size) => {
    const bestDistance = Math.abs(best - roundedValue)
    const sizeDistance = Math.abs(size - roundedValue)
    return sizeDistance < bestDistance ? size : best
  }, fontSizes[0])
}

export const getFontSizeByStep = (fontSize: number, step: number): number => {
  const index = fontSizes.indexOf(normalizeFontSizeToOption(fontSize))
  const newIndex = index + step
  if (newIndex >= 0 && newIndex < fontSizes.length) {
    return fontSizes[newIndex]
  }
  return fontSize
}
