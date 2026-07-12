import type { PropertiesMap, PropertyItem } from '@/types/properties'

export const normalizePropertyColor = (value: unknown, fallback = '#ffffff'): string => {
  const raw = String(value ?? '').trim()
  if (!raw) return fallback
  if (raw === '-1' || raw.toLowerCase() === 'transparent') return 'transparent'
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase()
  if (/^0x[0-9a-f]{6}$/i.test(raw)) return `#${raw.slice(2).toLowerCase()}`
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`
  return fallback
}

export const getColorPropertyEntries = (
  properties: PropertiesMap,
): Array<[string, PropertyItem, string]> =>
  Object.entries(properties)
    .filter(([, property]) => property.type === 'color')
    .map(([key, property]) => [key, property, normalizePropertyColor(property.value)])
