import type { ElementType } from '@/types/element'

export type UnitElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    fontSize: number
    fontFamily: string
    fill: string
  }
  resizable: boolean
  rotatable: boolean
}

export const unitSchema: UnitElementSchema = {
  type: 'unit',
  name: 'Unit',
  icon: 'mdi:alpha-u-box-outline',
  defaultConfig: {
    fontSize: 16,
    fontFamily: 'roboto-condensed-regular',
    fill: '#ffffff',
  },
  resizable: false,
  rotatable: false,
}
