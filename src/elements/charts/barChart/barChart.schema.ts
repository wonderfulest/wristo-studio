import type { ElementType } from '@/types/element'

export type BarChartElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    width: number
    height: number
    originX: 'left'
    originY: 'top'
    chartProperty: string
    barWidth: number
    colors: [string, string, string, string, string]
  }
  resizable: boolean
  rotatable: boolean
  disabled: boolean
}

export const barChartSchema: BarChartElementSchema = {
  type: 'barChart' as ElementType,
  name: 'Bar Chart',
  icon: 'mdi:chart-bar',
  defaultConfig: {
    width: 200,
    height: 80,
    originX: 'left',
    originY: 'top',
    chartProperty: 'steps',
    barWidth: 20,
    colors: ['#FF0000', '#FF5500', '#FFAA00', '#00FF00', '#00AA00'],
  },
  resizable: true,
  rotatable: false,
  disabled: false
}
