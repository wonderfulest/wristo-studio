import type { ElementType } from '@/types/element'

export type ImageElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    imageUrl: string
    width: number
    height: number
  }
  resizable: boolean
  rotatable: boolean
  disabled: boolean
}

export const imageSchema: ImageElementSchema = {
  type: 'image',
  name: 'Image',
  icon: 'mdi:image',
  defaultConfig: {
    imageUrl: '',
    width: 60,
    height: 60,
  },
  resizable: true,
  rotatable: false,
  disabled: false,
}
