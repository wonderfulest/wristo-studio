import type { TextElementConfig } from './text'

export interface IconElementConfig extends TextElementConfig {
  eleType: 'icon'
  metricSymbol: string
  iconSize: number
  iconFontFamily: string
}

export interface DataElementConfig extends TextElementConfig {
  eleType: 'data'
  metricSymbol: string
}

export interface IndicatorElementConfig extends TextElementConfig {
  eleType: 'indicator'
  metricSymbol: string
}

