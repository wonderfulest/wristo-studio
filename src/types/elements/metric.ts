import type { TextElementConfig } from './text'

export interface IconElementConfig extends TextElementConfig {
  eleType: 'icon'
  metricSymbol: string
  iconSize: number
  iconFontFamily: string
  dataProperty?: string
  goalProperty?: string
}

export interface DataElementConfig extends TextElementConfig {
  eleType: 'data'
  metricSymbol: string
  dataProperty?: string
  goalProperty?: string
}

export interface IndicatorElementConfig extends TextElementConfig {
  eleType: 'bluetooth' | 'disturb' | 'alarms' | 'notification'
}

