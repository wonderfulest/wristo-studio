import type { ElementType } from '@/types/element'

export type IconElementSchema = {
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

export const iconSchema: IconElementSchema = {
  type: 'icon',
  name: 'Icon',
  icon: 'star',
  defaultConfig: {
    fontSize: 24,
    fontFamily: 'roboto-condensed-regular',
    fill: '#ffffff',
  },
  resizable: false,
  rotatable: false,
}
