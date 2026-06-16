import { fontSizes } from '@/config/elements/options/typography'

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

export const normalizeFontSizeFields = <T extends object>(config: T): T => {
  if (!('fontSize' in config)) return config
  const next: Record<string, unknown> = { ...config }
  next.fontSize = normalizeFontSizeToOption(next.fontSize)
  if ('iconSize' in next) {
    next.iconSize = next.fontSize
  }
  return next as T
}

export const normalizeFontSizePatch = <T extends object>(patch: T): T => {
  return normalizeFontSizeFields(patch)
}
