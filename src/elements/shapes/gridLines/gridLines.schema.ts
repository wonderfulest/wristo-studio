import type { ElementType } from '@/types/element'

export type GridLinesElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    width: number
    height: number
    spacing: number
    lineWidth: number
    color: string
    colorProperty: string | null
    rotation: number
  }
  resizable: boolean
  rotatable: boolean
  disabled: boolean
}

export const gridLinesSchema: GridLinesElementSchema = {
  type: 'gridLines',
  name: 'Grid Lines',
  icon: 'mdi:grid',
  defaultConfig: {
    width: 200,
    height: 80,
    spacing: 20,
    lineWidth: 1,
    color: '#FFFFFF',
    colorProperty: null,
    rotation: 0,
  },
  resizable: true,
  rotatable: true,
  disabled: false,
}
