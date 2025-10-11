import type { BarChartElementConfig, LineChartElementConfig } from '@/types/elements/charts'
import { DEFAULT_BASE_CONFIG, EDITOR_ELEMENT } from './base'

export const DEFAULT_BARCHART_CONFIG: BarChartElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:chart-bar',
  label: 'Bar Chart',
  eleType: 'barChart' as const,
}, DEFAULT_BASE_CONFIG, {
  fill: '#FFFFFF',
  width: 200,
  height: 80,
  originX: 'left' as const,
  originY: 'top' as const,
  fontSize: 12,
  bgColor: 'transparent',
  fillMissing: true,
  xFont: 'roboto-condensed-regular',
  yFont: 'roboto-condensed-regular',
})

export const DEFAULT_LINECHART_CONFIG: LineChartElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:chart-line',
  label: 'Line Chart',
  eleType: 'lineChart' as const,
}, DEFAULT_BASE_CONFIG, {
  width: 200,
  height: 80,
  originX: 'center' as const,
  originY: 'center' as const,
  fill: '#FFFFFF',
  pointCount: 7,
  bgColor: 'transparent',
  fillMissing: true,
  showXLabels: false,
  showYLabels: false,
  xLabelColor: '#aaaaaa',
  yLabelColor: '#aaaaaa',
  xFont: 'RobotoCondensed-Regular',
  yFont: 'RobotoCondensed-Regular',
})
