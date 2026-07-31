import { VISUAL_THEME_COLOR_BINDINGS } from './visualThemeElementFields'
import type { AnyElementConfig } from '@/types/elements'
import type { PropertiesMap } from '@/types/properties'

export interface ExplicitColorBindingError {
  elementId: string
  elementType: string
  colorField: string
  propertyField: string
  propertyKey: string
  reason: 'missing' | 'not-color'
}

export const normalizeBindingColor = (value: unknown): string | null => {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  if (raw === '-1' || raw.toLowerCase() === 'transparent') return 'transparent'
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase()
  if (/^0x[0-9a-f]{6}$/i.test(raw)) return `#${raw.slice(2).toLowerCase()}`
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`
  return null
}

export const buildColorBindingPatch = (
  colorField: string,
  propertyField: string,
  color: string,
  propertyKey: string | null,
): Record<string, string | null> => ({
  [colorField]: color,
  [propertyField]: propertyKey,
})

export const collectExplicitColorBindings = (
  source: Record<string, unknown>,
): Record<string, string | null> => {
  const bindings: Record<string, string | null> = {}
  for (const [, propertyField] of VISUAL_THEME_COLOR_BINDINGS) {
    if (source[propertyField] === undefined) continue
    const value = source[propertyField]
    bindings[propertyField] = value == null || String(value).trim() === ''
      ? null
      : String(value)
  }
  return bindings
}

export function validateExplicitColorBindings(
  elements: AnyElementConfig[],
  properties: PropertiesMap,
): ExplicitColorBindingError[] {
  const errors: ExplicitColorBindingError[] = []
  for (const element of elements) {
    const record = element as unknown as Record<string, unknown>
    for (const [colorField, propertyField] of VISUAL_THEME_COLOR_BINDINGS) {
      const propertyKey = String(record[propertyField] ?? '').trim()
      if (!propertyKey) continue
      const property = properties[propertyKey]
      if (!property || property.type !== 'color') {
        errors.push({
          elementId: String(record.id ?? ''),
          elementType: String(record.eleType ?? ''),
          colorField,
          propertyField,
          propertyKey,
          reason: property ? 'not-color' : 'missing',
        })
      }
    }
  }
  return errors
}
