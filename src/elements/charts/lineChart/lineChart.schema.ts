import type { ElementType } from '@/types/element'

export type LineChartElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    width: number
    height: number
    originX: 'center'
    originY: 'center'
    fill: string
    pointCount: number
    bgColor: string
    fillMissing: boolean
    showXLabels: boolean
    showYLabels: boolean
    xLabelColor: string
    yLabelColor: string
    xFont: string
    yFont: string
  }
  resizable: boolean
  rotatable: boolean
}

export const lineChartSchema: LineChartElementSchema = {
  type: 'lineChart' as ElementType,
  name: 'Line Chart',
  icon: 'mdi:chart-line',
  defaultConfig: {
    width: 200,
    height: 80,
    originX: 'center',
    originY: 'center',
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
  },
  resizable: true,
  rotatable: false,
}
