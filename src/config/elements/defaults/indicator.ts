import type { IndicatorElementConfig } from '@/types/elements'
import { DEFAULT_TEXT_CONFIG, EDITOR_ELEMENT } from './base'

const DEFAULT_METRIC_SYMBOL: string = ':FIELD_TYPE_HEART_RATE'

export const DEFAULT_INDICATOR_CONFIG: IndicatorElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:clock-time-eight-outline',
  label: 'Indicator',
  eleType: 'indicator' as const,
}, DEFAULT_TEXT_CONFIG, {
  metricSymbol: DEFAULT_METRIC_SYMBOL,
  fontFamily: 'super-icons',
})
