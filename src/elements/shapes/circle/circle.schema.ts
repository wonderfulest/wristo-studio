import type { ElementType } from '@/types/element'

export type CircleElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    radius: number
    fill: string
    stroke: string
    strokeWidth: number
    opacity: number
    gradientEnabled: boolean
    gradientStartColor: string
    gradientEndColor: string
    gradientDirection: 'leftToRight' | 'rightToLeft' | 'topToBottom' | 'bottomToTop'
  }
  resizable: boolean
  rotatable: boolean
}

export const circleSchema: CircleElementSchema = {
  type: 'circle',
  name: 'Circle',
  icon: 'mdi:circle',
  defaultConfig: {
    radius: 50,
    fill: 'transparent',
    stroke: '#FFFFFF',
    strokeWidth: 2,
    opacity: 1,
    gradientEnabled: false,
    gradientStartColor: '#FFFFFF',
    gradientEndColor: '#FFFFFF',
    gradientDirection: 'leftToRight',
  },
  resizable: true,
  rotatable: false,
}
