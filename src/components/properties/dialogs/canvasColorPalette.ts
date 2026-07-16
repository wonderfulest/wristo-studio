import { normalizeRgb565Hex, parseHexColor } from '@/utils/rgb565Color'

export interface CanvasColorSource {
  config?: unknown
}

const collectColorsFromValue = (value: unknown, colors: Set<string>, fieldName?: string): void => {
  if (typeof value === 'string') {
    if (fieldName?.endsWith('Property')) return
    if (parseHexColor(value)) colors.add(normalizeRgb565Hex(value))
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectColorsFromValue(item, colors, fieldName))
    return
  }

  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value)
    if (prototype === Object.prototype || prototype === null) {
      Object.entries(value).forEach(([key, item]) => collectColorsFromValue(item, colors, key))
    }
  }
}

export const collectCanvasColors = (elements: CanvasColorSource[]): string[] => {
  const colors = new Set<string>()
  elements.forEach((element) => collectColorsFromValue(element.config, colors))
  return Array.from(colors)
}
