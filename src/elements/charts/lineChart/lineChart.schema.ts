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
    chartProperty: string
    color: string
    lineWidth: number
    showPoints: boolean
    pointColor: string
    pointRadius: number
  }
  resizable: boolean
  rotatable: boolean
  disabled: boolean
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
    chartProperty: 'steps',
    color: '#FFFFFF',
    lineWidth: 2,
    showPoints: true,
    pointColor: '#FFFFFF',
    pointRadius: 6,
  },
  resizable: true,
  rotatable: false,
  disabled: false
}
