import type { TextElementConfig } from './text'

export interface IndicatorElementConfig extends TextElementConfig {
  eleType: 'indicator'
  metricSymbol: string
}
