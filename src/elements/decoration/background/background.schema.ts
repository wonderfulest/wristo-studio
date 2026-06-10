import type { ElementType } from '@/types/element'
import { DEFAULT_BACKGROUND_IMAGE_URL } from './background.constants'

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
    imageUrl: DEFAULT_BACKGROUND_IMAGE_URL,
    imageId: null,
  },
  disabled: false,
}
