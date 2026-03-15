import type { ElementType } from '@/types/element'

export type AngledTextElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    fontSize: number
    fontFamily: string
    fill: string
    angle: number
  }
  resizable: boolean
  rotatable: boolean
}

export const angledTextSchema: AngledTextElementSchema = {
  type: 'angledText',
  name: 'Angled Text',
  icon: 'mdi:format-text-rotation-down',
  defaultConfig: {
    fontSize: 36,
    fontFamily: 'roboto-condensed-regular',
    fill: '#ffffff',
    angle: -45,
  },
  resizable: true,
  rotatable: true,
}
