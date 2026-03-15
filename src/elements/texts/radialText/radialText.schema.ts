import type { ElementType } from '@/types/element'

export type RadialTextElementSchema = {
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

export const radialTextSchema: RadialTextElementSchema = {
  type: 'radialText',
  name: 'Radial Text',
  icon: 'mdi:alpha-r-circle-outline',
  defaultConfig: {
    fontSize: 36,
    fontFamily: 'roboto-condensed-regular',
    fill: '#ffffff',
  },
  resizable: true,
  rotatable: false,
}
