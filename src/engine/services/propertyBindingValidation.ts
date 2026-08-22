import type { FabricElement } from '@/types/element'
import type { PropertiesMap } from '@/types/properties'

type Translate = (key: string, params?: Record<string, string | number>) => string

const validDialOptions = (property: any, mode: unknown): boolean => {
  const options = property.options
  if (!Array.isArray(options) || options.length === 0) return false
  const values = new Set<unknown>()
  const symbols = new Set<string>()
  let selected = false
  for (const option of options) {
    const symbol = String(option?.metricSymbol ?? '').trim()
    if (!option || option.dialMode !== mode || !symbol.startsWith(':')) return false
    if (values.has(option.value) || symbols.has(symbol)) return false
    values.add(option.value)
    symbols.add(symbol)
    if (option.value === property.value) selected = true
    if (mode === 'goal' && option.dialGoalSource !== 'garmin') return false
    if (mode === 'range') {
      const min = Number(option.dialMin)
      const max = Number(option.dialMax)
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return false
    }
    if (mode === 'direction' && option.dialDirectionUnit !== 'degree') return false
  }
  return selected
}

/**
 * 校验数据、目标、图表和文本属性绑定，并拒绝元素引用不存在的数据属性。
 */
export function validateDataGoalBindings(
  objects: FabricElement[],
  properties: PropertiesMap,
  t: Translate,
): string[] {
  const errors: string[] = []
  const elements = objects.filter((o) => {
    const type = (o as any).eleType
    return type && type !== 'background' && type !== 'global'
  })

  const missingDataProperties = new Set<string>()
  for (const element of elements) {
    const key = String((element as any).dataProperty ?? '').trim()
    if (!key || properties[key]?.type === 'data' || missingDataProperties.has(key)) continue
    missingDataProperties.add(key)
    errors.push(t('export.validation.missingDataProperty', { key }))
  }

  const missingDateProperties = new Set<string>()
  for (const element of elements) {
    const key = String((element as any).dateProperty ?? '').trim()
    if (!key || properties[key]?.type === 'date' || missingDateProperties.has(key)) continue
    missingDateProperties.add(key)
    errors.push(t('export.validation.missingDateProperty', { key }))
  }

  for (const element of elements) {
    if ((element as any).eleType !== 'rotatingHand') continue
    const id = String((element as any).id ?? 'rotatingHand')
    const key = String((element as any).dialProperty ?? '').trim()
    const property = key ? properties[key] : undefined
    if (!key || property?.type !== 'dial') {
      errors.push(t('export.validation.missingDialProperty', { id, key }))
      continue
    }

    const mode = (element as any).progressMode
    if (property.dialMode !== mode) {
      errors.push(t('export.validation.dialModeMismatch', { id, key }))
      continue
    }

    if (!validDialOptions(property, mode)) {
      errors.push(t('export.validation.invalidDialMetric', { id, key }))
    }
  }

  for (const [key, prop] of Object.entries(properties)) {
    if (prop.type === 'data') {
      const bound = elements.some((o) => (o as any).dataProperty === key)
      if (!bound) {
        errors.push(t('export.validation.unboundDataProperty', { title: prop.title, key }))
      }
    }
    if (prop.type === 'goal') {
      const bound = elements.some((o) => (o as any).goalProperty === key)
      if (!bound) {
        errors.push(t('export.validation.unboundGoalProperty', { title: prop.title, key }))
      }
    }
    if (prop.type === 'chart') {
      const bound = elements.some((o) => (o as any).chartProperty === key)
      if (!bound) {
        errors.push(t('export.validation.unboundChartProperty', { title: prop.title, key }))
      }
    }
    if (prop.type === 'text') {
      const bound = elements.some((o) => (o as any).textProperty === key)
      if (!bound) {
        errors.push(t('export.validation.unboundTextProperty', { title: prop.title, key }))
      }
    }
    if (prop.type === 'date') {
      const bound = elements.some((o) => (o as any).dateProperty === key)
      if (!bound) {
        errors.push(t('export.validation.unboundDateProperty', { title: prop.title, key }))
      }
    }
  }

  return errors
}
