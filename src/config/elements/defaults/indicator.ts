import type { IndicatorElementConfig } from '@/types/elements'
import { DEFAULT_TEXT_CONFIG, EDITOR_ELEMENT } from './base'

const DEFAULT_METRIC_SYMBOL: string = ':FIELD_TYPE_HEART_RATE'

export const DEFAULT_BLUETOOTH_CONFIG: IndicatorElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:clock-time-eight-outline',
  eleType: 'bluetooth' as const,
}, DEFAULT_TEXT_CONFIG, {
  label: 'Bluetooth',
  metricSymbol: DEFAULT_METRIC_SYMBOL,
  fontFamily: 'super-icons',
})

export const DEFAULT_DISTURB_CONFIG: IndicatorElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:clock-time-eight-outline',
  eleType: 'disturb' as const,
}, DEFAULT_TEXT_CONFIG, {
  label: 'Disturb',
  metricSymbol: DEFAULT_METRIC_SYMBOL,
  fontFamily: 'super-icons',
})

export const DEFAULT_ALARMS_CONFIG: IndicatorElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:clock-time-eight-outline',
  eleType: 'alarms' as const,
}, DEFAULT_TEXT_CONFIG, {
  label: 'Alarms',
  metricSymbol: DEFAULT_METRIC_SYMBOL,
  fontFamily: 'super-icons',
})

export const DEFAULT_NOTIFICATION_CONFIG: IndicatorElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:clock-time-eight-outline',
  eleType: 'notification' as const,
}, DEFAULT_TEXT_CONFIG, {
  label: 'Notification',
  metricSymbol: DEFAULT_METRIC_SYMBOL,
  fontFamily: 'super-icons',
})

