import { FontTypes } from '@/config/fonts'
import { TimeFormatConstants } from '@/config/elements/options/timeFormats'

const AM_PM_FORMATTERS = new Set<number>([
  TimeFormatConstants.A,
  TimeFormatConstants.a,
])

export const resolveTimeFontTypes = (formatters: Array<number | null | undefined>): string[] => {
  const containsAmPm = formatters.some((formatter) => AM_PM_FORMATTERS.has(Number(formatter)))
  return containsAmPm
    ? [FontTypes.TEXT_FONT]
    : [FontTypes.NUMBER_FONT, FontTypes.TEXT_FONT]
}

export const resolvePrimaryTimeFontType = (formatters: Array<number | null | undefined>): string =>
  resolveTimeFontTypes(formatters)[0]
