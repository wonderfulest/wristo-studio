import type { ElementType } from '@/types/element'
import { DEFAULT_BACKGROUND_COLOR, DEFAULT_BACKGROUND_IMAGE_URL } from './background.constants'

export type BackgroundElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    color: string
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
    color: DEFAULT_BACKGROUND_COLOR,
    imageUrl: DEFAULT_BACKGROUND_IMAGE_URL,
    imageId: null,
  },
  disabled: false,
}
