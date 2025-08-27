import { ElementConfig } from "../element"

export interface BaseChartConfig extends ElementConfig {
  left: number
  top: number
  width: number
  height: number
  originX: 'left' | 'center' | 'right'
  originY: 'top' | 'center' | 'bottom'
}

export interface BarChartElementConfig extends BaseChartConfig {
  color?: string
  bgColor?: string
  pointCount?: number
  fillMissing?: boolean
  minY?: number
  maxY?: number
  barWidth?: number
  chartProperty?: string
  showGrid?: boolean
  gridColor?: string
  gridYCount?: number
  showXAxis?: boolean
  showYAxis?: boolean
  xAxisColor?: string
  yAxisColor?: string
  showXLabels?: boolean
  showYLabels?: boolean
  xLabelColor?: string
  yLabelColor?: string
  xFont?: string
  yFont?: string
  xFontSize?: number
  yFontSize?: number
}

export interface LineChartElementConfig extends BaseChartConfig {
  color?: string
  bgColor?: string
  pointCount?: number
  fillMissing?: boolean
  lineWidth?: number
  smoothFactor?: number
  showPoints?: boolean
  pointColor?: string
  pointRadius?: number
  showGrid?: boolean
  gridColor?: string
  gridYCount?: number
  gridXCount?: number
  showAxis?: boolean
  axisColor?: string
  showXLabels?: boolean
  showYLabels?: boolean
  xLabelColor?: string
  yLabelColor?: string
  xFont?: string
  yFont?: string
  xFontSize?: number
  yFontSize?: number
  timeFormat?: string
  yLabelWidth?: number
  xLabelHeight?: number
  chartProperty?: string
}
