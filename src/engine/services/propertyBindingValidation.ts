import type { FabricElement } from '@/types/element'
import type { PropertiesMap } from '@/types/properties'

type Translate = (key: string, params?: Record<string, string | number>) => string

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
  }

  return errors
}
