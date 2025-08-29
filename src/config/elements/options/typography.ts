// Typography related options

export const fontSizes: number[] = [
  6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72,
  78, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204, 216, 228, 240, 264,
  288, 312,
]

export const getFontSizeByStep = (fontSize: number, step: number): number => {
  const index = fontSizes.indexOf(fontSize)
  const newIndex = index + step
  if (newIndex >= 0 && newIndex < fontSizes.length) {
    return fontSizes[newIndex]
  }
  return fontSize
}
