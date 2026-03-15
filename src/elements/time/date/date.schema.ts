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
    formatter: number
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
    formatter: DateFormatConstants.MMM_D_DDD,
  },
  resizable: false,
  rotatable: false,
}
