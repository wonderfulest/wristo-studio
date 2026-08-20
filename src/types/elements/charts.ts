import type { BaseElementConfig } from './base'

export interface BaseChartConfig extends BaseElementConfig {
  width: number
  height: number
  fontSize?: number
}

export interface BarChartElementConfig extends BaseChartConfig {
  chartProperty?: string
  barWidth?: number
  colors?: [string, string, string, string, string] | string[]
}

export interface LineChartElementConfig extends BaseChartConfig {
  chartProperty?: string
  color?: string
  colorProperty?: string | null
  lineWidth?: number
  showPoints?: boolean
  pointColor?: string
  pointColorProperty?: string | null
  pointRadius?: number
}
