import type { ElementType } from '@/types/element'

export type ScrollableTextElementSchema = {
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

export const scrollableTextSchema: ScrollableTextElementSchema = {
  type: 'scrollableText',
  name: 'Scrollable',
  icon: 'iconfont icon-scrolltext',
  defaultConfig: {
    fontSize: 36,
    fontFamily: 'roboto-condensed-regular',
    fill: '#ffffff',
  },
  resizable: true,
  rotatable: false,
}
