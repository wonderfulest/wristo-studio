import type { ElementType } from '@/types/element'

export type LabelElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    fontSize: number
    fontFamily: string
    fill: string
    text: string
  }
  resizable: boolean
  rotatable: boolean
}

export const labelSchema: LabelElementSchema = {
  type: 'label',
  name: 'Label',
  icon: 'mdi:label-outline',
  defaultConfig: {
    fontSize: 14,
    fontFamily: 'roboto-condensed-regular',
    fill: '#ffffff',
    text: 'Label',
  },
  resizable: false,
  rotatable: false,
}
