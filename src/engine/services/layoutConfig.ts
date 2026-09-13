import type { PropertiesMap } from '@/types/properties'
import type { LayoutVisibility } from '@/types/layout'

export const layoutProperties = (properties: PropertiesMap) =>
  Object.entries(properties).filter(([, property]) => property.type === 'layout')

export function resolveLayoutValue(properties: PropertiesMap, key: string, previewValues: Record<string, unknown> = {}): unknown {
  const property = properties[key]
  const preview = previewValues[key]
  return property?.options?.some(option => option.value === preview) ? preview : property?.value
}

export function resolveLayoutVisibility(binding: LayoutVisibility | null | undefined, properties: PropertiesMap, previewValues: Record<string, unknown> = {}): boolean {
  if (binding == null) return true
  if (properties[binding.propertyKey]?.type !== 'layout' || !Array.isArray(binding.values)) return false
  return binding.values.includes(resolveLayoutValue(properties, binding.propertyKey, previewValues) as number)
}

export function validateLayoutConfig(properties: PropertiesMap, elements: Array<{ id?: unknown; layoutVisibility?: unknown }>): string[] {
  const errors: string[] = []
  const layouts = layoutProperties(properties)
  if (layouts.length > 1) errors.push('Only one global layout parameter is allowed.')
  for (const [key, property] of layouts) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) errors.push('Layout parameter key must be a valid identifier.')
    const options = property.options
    if (!property.title?.trim()) errors.push('Layout title is required.')
    if (!Array.isArray(options) || !options.length) {
      errors.push('Add at least one layout option.')
      continue
    }
    const values = new Set<unknown>()
    const labels = new Set<string>()
    for (const option of options) {
      if (!Number.isInteger(option.value) || Number(option.value) <= 0 || Number(option.value) > 2147483647 || values.has(option.value)) {
        errors.push('Layout options must have unique positive integer values.')
      }
      const label = typeof option.label === 'string' ? option.label.trim().toLowerCase() : ''
      if (!label || labels.has(label)) errors.push('Layout option names must be nonempty and unique.')
      values.add(option.value)
      labels.add(label)
    }
    if (!values.has(property.value)) errors.push('Choose an existing layout as the default.')
  }
  for (const element of elements) {
    const binding = element.layoutVisibility as LayoutVisibility | null | undefined
    if (binding == null) continue
    const property = properties[binding.propertyKey]
    if (property?.type !== 'layout' || !Array.isArray(binding.values) || !binding.values.length
      || new Set(binding.values).size !== binding.values.length
      || binding.values.some(value => !property.options?.some(option => option.value === value))) {
      errors.push(`Element ${element.id ?? ''}: layout binding references missing or invalid layout options. Update its layout selection first.`)
    }
  }
  return errors
}
