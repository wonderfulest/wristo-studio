import { DateFormatOptions } from '@/config/elements/options/dateFormats'
import { TimeFormatOptions } from '@/config/elements/options/timeFormats'
import type { LayerElement } from '@/types/layer'
import type { PropertiesMap } from '@/types/properties'
import { normalizeLayerName } from './layerName'

export type BindingMetricIdentity = {
  dataProperty?: string
  goalProperty?: string
  metricSymbol?: string
}

export type LayerBindingSummaryContext = {
  language: 'en' | 'zh'
  properties: PropertiesMap
  typeLabel: (eleType: string) => string
  metricLabel: (identity: BindingMetricIdentity) => string
}

const readText = (value: unknown): string => String(value ?? '').trim()

const readLayerValue = (layer: LayerElement, key: string): unknown => {
  const object = layer.element ?? layer
  return object[key] ?? (layer as unknown as Record<string, unknown>)[key]
}

const resolveGoalLabel = (propertyKey: string, context: LayerBindingSummaryContext): string => {
  const property = context.properties[propertyKey]
  if (!property || property.type !== 'goal') return ''
  const selected = property.options?.find((option) => option.value === property.value)
  if (!selected) return ''
  return context.language === 'zh'
    ? readText(selected.labelCn) || readText(selected.label)
    : readText(selected.label)
}

const resolveBindingDetail = (layer: LayerElement, context: LayerBindingSummaryContext): string => {
  const dataProperty = readText(readLayerValue(layer, 'dataProperty'))
  const goalProperty = readText(readLayerValue(layer, 'goalProperty'))
  const metricSymbol = readText(readLayerValue(layer, 'metricSymbol'))

  if (goalProperty) {
    return resolveGoalLabel(goalProperty, context)
      || context.metricLabel({ goalProperty, metricSymbol })
  }
  if (dataProperty || metricSymbol) {
    return context.metricLabel({ dataProperty, metricSymbol })
  }
  if (layer.eleType === 'date') {
    const formatter = Number(readLayerValue(layer, 'formatter'))
    return DateFormatOptions.find((option) => option.value === formatter)?.label ?? ''
  }
  if (layer.eleType === 'time') {
    const formatter = Number(readLayerValue(layer, 'formatter'))
    return TimeFormatOptions.find((option) => option.value === formatter)?.label ?? ''
  }
  if (layer.eleType === 'weather') {
    return context.language === 'zh' ? '天气状况' : 'Weather Condition'
  }
  return ''
}

export const resolveLayerDisplayName = (layer: LayerElement, context: LayerBindingSummaryContext): string => {
  const customName = normalizeLayerName(layer.layerName)
  if (customName) return customName
  const typeLabel = context.typeLabel(layer.eleType)
  const detail = resolveBindingDetail(layer, context)
  return detail ? `${typeLabel} · ${detail}` : typeLabel
}

export const resolveLayerGroupDisplayName = (
  key: string,
  context: LayerBindingSummaryContext
): string => {
  const property = context.properties[key]
  if (!property || (property.type !== 'data' && property.type !== 'goal')) return key
  const detail = property.type === 'goal'
    ? resolveGoalLabel(key, context) || context.metricLabel({ goalProperty: key })
    : context.metricLabel({ dataProperty: key })
  return detail ? `${context.typeLabel(property.type)} · ${detail}` : key
}
