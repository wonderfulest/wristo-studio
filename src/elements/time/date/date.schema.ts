import { DateFormatConstants } from '@/config/settings'
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
    dateProperty: string
    formatter: number
    formatterOptions: number[]
    dateFormatMode: 'preset' | 'custom'
    dateTemplate: string
  }
  resizable: boolean
  rotatable: boolean
}

export const dateSchema: DateElementSchema = {
  type: 'date',
  name: 'Date',
  icon: 'mdi:calendar-outline',
  defaultConfig: {
    fontSize: 24,
    fontFamily: 'roboto-condensed-regular',
    fill: '#ffffff',
    dateProperty: '',
    formatter: DateFormatConstants.MMM_D_DDD,
    formatterOptions: [],
    dateFormatMode: 'preset',
    dateTemplate: '(dt5.1) + "." + (dt3).format("%02d") + "." + (tm2).format("%02d")',
  },
  resizable: false,
  rotatable: false,
}
