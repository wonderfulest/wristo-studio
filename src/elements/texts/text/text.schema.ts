import type { ElementType } from '@/types/element'

export type TextElementSchema = {
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

export const textSchema: TextElementSchema = {
  type: 'text',
  name: 'Text',
  icon: 'mdi:format-text',
  defaultConfig: {
    fontSize: 36,
    fontFamily: 'roboto-condensed-regular',
    fill: '#ffffff',
  },
  resizable: true,
  rotatable: false,
}
