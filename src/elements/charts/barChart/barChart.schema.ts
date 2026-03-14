import type { ElementType } from '@/types/element'

export type BarChartElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    fill: string
    width: number
    height: number
    originX: 'left'
    originY: 'top'
    fontSize: number
    bgColor: string
    fillMissing: boolean
    xFont: string
    yFont: string
  }
  resizable: boolean
  rotatable: boolean
}

export const barChartSchema: BarChartElementSchema = {
  type: 'barChart' as ElementType,
  name: 'Bar Chart',
  icon: 'mdi:chart-bar',
  defaultConfig: {
    fill: '#FFFFFF',
    width: 200,
    height: 80,
    originX: 'left',
    originY: 'top',
    fontSize: 12,
    bgColor: 'transparent',
    fillMissing: true,
    xFont: 'roboto-condensed-regular',
    yFont: 'roboto-condensed-regular',
  },
  resizable: true,
  rotatable: false,
}
