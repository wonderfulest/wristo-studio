import type { TextElementConfig } from './text'

export interface IndicatorElementConfig extends TextElementConfig {
  eleType: 'bluetooth' | 'disturb' | 'alarms' | 'notification'
  metricSymbol?: string
}
