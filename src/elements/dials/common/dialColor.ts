import { filters } from 'fabric'
import type { PropertiesMap } from '@/types/properties'
import type { DialType } from './dial.schema'

export const normalizePropertyColor = (value: unknown, fallback = '#ffffff'): string => {
  const raw = String(value ?? '').trim()
  if (!raw) return fallback
  if (raw === '-1' || raw.toLowerCase() === 'transparent') return 'transparent'
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase()
  if (/^0x[0-9a-f]{6}$/i.test(raw)) return `#${raw.slice(2).toLowerCase()}`
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`
  return fallback
}

export interface DialColorPatch {
  fillProperty: string
  fill: string
}

export const supportsDialDynamicColor = (type: DialType): boolean =>
  type === 'tick12' || type === 'tick60'

export const resolveDialColorPatch = (
  propertyKey: string,
  properties: PropertiesMap,
  currentFill = '#ffffff',
): DialColorPatch => {
  const key = String(propertyKey || '').trim()
  const property = key ? properties[key] : undefined
  if (!property || property.type !== 'color') {
    return {
      fillProperty: '',
      fill: normalizePropertyColor(currentFill),
    }
  }

  return {
    fillProperty: key,
    fill: normalizePropertyColor(property.value),
  }
}

export const applyDialColorPreview = (
  image: any,
  fill: unknown,
  _fillProperty: unknown,
): void => {
  if (!image) return

  const existingFilters = Array.isArray(image.filters) ? image.filters : []
  image.filters = existingFilters.filter((filter: any) => !filter?.__wristoDialColorFilter)

  const normalizedFill = normalizePropertyColor(fill)
  if (normalizedFill !== 'transparent') {
    const filter: any = new filters.BlendColor({
      color: normalizedFill,
      mode: 'tint',
      alpha: 1,
    })
    filter.__wristoDialColorFilter = true
    image.filters.push(filter)
  }

  image.applyFilters?.()
}
