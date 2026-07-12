import { filters } from 'fabric'
import type { PropertiesMap } from '@/types/properties'
import { normalizePropertyColor } from '@/elements/common/settings/colorProperty'
import type { DialType } from './dial.schema'

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
  fillProperty: unknown,
): void => {
  if (!image) return

  const existingFilters = Array.isArray(image.filters) ? image.filters : []
  image.filters = existingFilters.filter((filter: any) => !filter?.__wristoDialColorFilter)

  if (String(fillProperty || '').trim()) {
    const normalizedFill = normalizePropertyColor(fill)
    const filter: any = new filters.BlendColor({
      color: normalizedFill === 'transparent' ? '#000000' : normalizedFill,
      mode: 'tint',
      alpha: 1,
    })
    filter.__wristoDialColorFilter = true
    image.filters.push(filter)
  }

  image.applyFilters?.()
}
