import { DateFormatConstants } from '@/config/settings'
import { formatChineseCulturalDate } from '@/utils/chineseCalendar'

const FESTIVAL_OR_SOLAR_TERM_DESIGN_SAMPLE = '国庆+10'

export function formatChineseDatePreview(
  date: Date,
  formatter: number,
  locale: string | null | undefined,
): string {
  const value = formatChineseCulturalDate(date, formatter, locale)
  if (value || formatter !== DateFormatConstants.FESTIVAL_OR_SOLAR_TERM) return value
  return FESTIVAL_OR_SOLAR_TERM_DESIGN_SAMPLE
}
