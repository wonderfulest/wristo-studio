import type { ElementType } from '@/types/element'

export type BackgroundElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    imageUrl: string
    imageId: number | null
  }
  disabled: boolean
}

export const backgroundSchema: BackgroundElementSchema = {
  type: 'background',
  name: 'Background',
  icon: 'mdi:image-area',
  defaultConfig: {
    imageUrl: '',
    imageId: null,
  },
  disabled: false,
}
