import type { ElementType } from '@/types/element'

export type LineElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    x1: number
    y1: number
    x2: number
    y2: number
    stroke: string
    strokeWidth: number
    opacity: number
  }
  resizable: boolean
  rotatable: boolean
}

export const lineSchema: LineElementSchema = {
  type: 'line',
  name: 'Line',
  icon: 'mdi:vector-line',
  defaultConfig: {
    x1: 202,
    y1: 227,
    x2: 252,
    y2: 227,
    stroke: '#FFFFFF',
    strokeWidth: 2,
    opacity: 1,
  },
  resizable: false,
  rotatable: false,
}
