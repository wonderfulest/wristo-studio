import moment from 'moment'
import { TimeFormatConstants, TimeFormatOptions } from '@/config/elements/options/timeFormats'

export function formatTimePreview(date: Date, formatter: number): string {
  if (formatter === TimeFormatConstants.HOUR_FORMAT) {
    return '24H'
  }

  const formatterOption = TimeFormatOptions.find((option) => option.value === formatter)
  const format = formatterOption?.label ?? '--'
  const value = moment(date)
  const hour = value.format('HH')
  const minute = value.format('mm')

  switch (formatter) {
    case TimeFormatConstants.H10:
      return hour[0]
    case TimeFormatConstants.H:
      return hour[1]
    case TimeFormatConstants.M10:
      return minute[0]
    case TimeFormatConstants.M:
      return minute[1]
    case TimeFormatConstants.COLON:
      return ':'
    default:
      return value.format(format)
  }
}

export function normalizeHourFormatRenderConfig<T extends { formatter: number; fontRenderType?: 'system' | 'truetype' | 'bitmap'; fontFamily?: string }>(config: T): T {
  if (config.formatter !== TimeFormatConstants.HOUR_FORMAT || config.fontRenderType !== 'bitmap') {
    return config
  }

  return {
    ...config,
    fontRenderType: 'truetype',
    fontFamily: config.fontFamily || 'roboto-condensed-regular'
  }
}
