import type { TimeElementConfig, DateElementConfig } from '@/types/elements'
import { TimeFormatConstants, DateFormatConstants } from '../../settings'
import { DEFAULT_TEXT_CONFIG, EDITOR_ELEMENT } from './base'

export const DEFAULT_TIME_CONFIG: TimeElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:clock-time-eight-outline',
  label: 'Time',
  eleType: 'time' as const,
}, DEFAULT_TEXT_CONFIG, {
  formatter: TimeFormatConstants.HH_MM_SS,
})

export const DEFAULT_DATE_CONFIG: DateElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:clock-time-eight-outline',
  label: 'Date',
  eleType: 'date' as const,
}, DEFAULT_TEXT_CONFIG, {
  formatter: DateFormatConstants.MMM_D_YYYY,
})
