import type { PropertiesMap } from '@/types/properties'

/** Same stable sortOrder convention as scaffold's _property_position. */
export function orderedThemeColorProperties(properties: PropertiesMap) {
  const position = (value: unknown) => typeof value === 'number'
    && Number.isSafeInteger(value) && value >= 0 ? value : Infinity
  return Object.entries(properties)
    .filter(([, property]) => property.type === 'color')
    .sort(([, a], [, b]) => position(a.sortOrder) - position(b.sortOrder))
}

function rgbHex(value: unknown): string | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= 0xFFFFFF
      ? value.toString(16).padStart(6, '0').toUpperCase() : null
  }
  if (typeof value !== 'string') return null
  const match = /^(?:#|0x)([a-f0-9]{6}|[a-f0-9]{3})$/i.exec(value.trim())
  if (match) return (match[1].length === 3
    ? [...match[1]].map(digit => digit + digit).join('') : match[1]).toUpperCase()
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(value.trim())
  if (rgb && rgb.slice(1).every(channel => Number(channel) <= 255)) {
    return rgb.slice(1).map(channel => Number(channel).toString(16).padStart(2, '0')).join('').toUpperCase()
  }
  return null
}

export function encodeThemeColorCode(properties: PropertiesMap, colors: Record<string, string> = {}): string {
  const parts = orderedThemeColorProperties(properties).map(([key, property]) =>
    rgbHex(colors[key] ?? property.value))
  // Transparency is not representable in RGB; never silently replace it.
  return parts.some(part => part === null) ? '' : parts.join('')
}

export function decodeThemeColorCode(code: string, properties: PropertiesMap): Record<string, string> | null {
  const entries = orderedThemeColorProperties(properties)
  if (!entries.length || code.length !== entries.length * 6 || !/^[0-9a-f]+$/i.test(code)) return null
  return Object.fromEntries(entries.map(([key], index) =>
    [key, `0x${code.slice(index * 6, index * 6 + 6).toUpperCase()}`]))
}
