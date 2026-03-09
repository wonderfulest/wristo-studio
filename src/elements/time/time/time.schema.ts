import type { ElementType } from '@/types/element'

export type TimeElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    fontSize: number
    fontFamily: string
    fill: string
    formatter: number
    fontRenderType: 'truetype' | 'bitmap'
    bitmapFontId: number | null
    fontGap: number
  }
  resizable: boolean
  rotatable: boolean
}

export const timeSchema: TimeElementSchema = {
  type: 'time',
  name: 'Time',
  icon: 'clock',
  defaultConfig: {
    fontSize: 24,
    fontFamily: 'roboto-condensed-regular',
    fill: '#ffffff',
    formatter: 0,
    fontRenderType: 'truetype',
    bitmapFontId: null,
    fontGap: 4,
  },
  resizable: false,
  rotatable: false,
}
