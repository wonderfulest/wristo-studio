import type { ElementType } from '@/types/element'

// Date 元素的基础描述 Schema
export type DateElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    fontSize: number
    fontFamily: string
    fill: string
    formatter: number
  }
  resizable: boolean
  rotatable: boolean
}

export const dateSchema: DateElementSchema = {
  type: 'date',
  name: 'Date',
  icon: 'calendar',
  defaultConfig: {
    fontSize: 24,
    fontFamily: 'roboto-condensed-regular',
    fill: '#ffffff',
    formatter: 0,
  },
  resizable: false,
  rotatable: false,
}
