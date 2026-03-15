import type { ElementType } from '@/types/element'

export type BatteryElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    width: number
    height: number
    padding: number
    headGap: number
    bodyStroke: string
    bodyFill: string
    bodyStrokeWidth: number
    bodyRx: number
    bodyRy: number
    headWidth: number
    headHeight: number
    headFill: string
    headRx: number
    headRy: number
    level: number
    levelColorLow: string
    levelColorMedium: string
    levelColorHigh: string
  }
  resizable: boolean
  rotatable: boolean
}

export const batterySchema: BatteryElementSchema = {
  type: 'battery',
  name: 'Battery',
  icon: 'mdi:battery',
  defaultConfig: {
    width: 28,
    height: 18,
    padding: 2,
    headGap: 1,
    bodyStroke: '#ffffff',
    bodyFill: 'transparent',
    bodyStrokeWidth: 2,
    bodyRx: 2,
    bodyRy: 2,
    headWidth: 2,
    headHeight: 9,
    headFill: '#ffffff',
    headRx: 1,
    headRy: 1,
    level: 0.5,
    levelColorLow: '#ff0000',
    levelColorMedium: '#ffaa00',
    levelColorHigh: '#00ff00',
  },
  resizable: true,
  rotatable: false,
}
