import type { BaseElementConfig } from './base'

export interface BaseTextConfig extends BaseElementConfig {
  fontSize: number
  fill: string
  fontFamily: string
  originX: 'left' | 'center' | 'right'
  originY: 'top' | 'center' | 'bottom'
}

export interface DataElementConfig extends BaseTextConfig {
  eleType: 'data' | 'icon' | 'label' | 'unit'
  metricSymbol: string
  metricValue?: string
  dataProperty?: string
  goalProperty?: string
}

export interface IconElementConfig extends DataElementConfig {
  eleType: 'icon'
}

export interface LabelElementConfig extends DataElementConfig {
  eleType: 'label'
  text: string
}

export interface UnitElementConfig extends DataElementConfig {
  eleType: 'unit'
}