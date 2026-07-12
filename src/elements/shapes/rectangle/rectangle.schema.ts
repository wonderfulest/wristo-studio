import type { ElementType } from '@/types/element'

export type RectangleElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    width: number
    height: number
    borderRadius: number
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

export const rectangleSchema: RectangleElementSchema = {
  type: 'rectangle',
  name: 'Rectangle',
  icon: 'mdi:rectangle',
  defaultConfig: {
    width: 100,
    height: 50,
    borderRadius: 5,
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
