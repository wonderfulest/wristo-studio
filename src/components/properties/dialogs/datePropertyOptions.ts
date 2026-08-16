import {
  DateFormatConstants,
  DateFormatOptions,
} from '@/config/elements/options/dateFormats'
import { getAllowedDateFormatters } from '@/domain/designLanguageCapabilities'
import type { AppLanguage } from '@/types/localization'
import type { OptionFormat } from '@/types/settings'

export type DateOptionLengthBand = 'all' | 'short' | 'medium' | 'long'

const COMMON_DATE_FORMATTERS: Record<AppLanguage, readonly number[]> = {
  eng: [
    DateFormatConstants.DD,
    DateFormatConstants.DDD,
    DateFormatConstants.MMM_D,
    DateFormatConstants.MMMM_D,
    DateFormatConstants.MMM_D_YYYY,
    DateFormatConstants.DD_MM_YYYY,
    DateFormatConstants.MM_DD_YYYY,
    DateFormatConstants.YYYY_MM_DD,
  ],
  zhs: [
    DateFormatConstants.SOLAR_MONTH_DAY,
    DateFormatConstants.SOLAR_MONTH_DAY_ZH,
    DateFormatConstants.LUNAR_DATE,
    DateFormatConstants.LUNAR_MONTH,
    DateFormatConstants.LUNAR_DAY,
    DateFormatConstants.CHINESE_WEEKDAY_SHORT,
    DateFormatConstants.SOLAR_FESTIVAL,
    DateFormatConstants.SOLAR_TERM,
  ],
}

export const getCommonDateFormatterValues = (appLanguage: AppLanguage): number[] => (
  [...COMMON_DATE_FORMATTERS[appLanguage]]
)

export const resolveDateFormatterValues = (
  values: readonly unknown[] | null | undefined,
  appLanguage: AppLanguage,
): number[] => {
  const allowed = new Set(getAllowedDateFormatters(appLanguage))
  if (!Array.isArray(values)) return DateFormatOptions
    .map(option => option.value)
    .filter(value => allowed.has(value))

  const result: number[] = []
  for (const rawValue of values) {
    const value = Number(rawValue)
    if (!allowed.has(value) || result.includes(value)) continue
    result.push(value)
  }
  return result.length > 0 ? result : getCommonDateFormatterValues(appLanguage)
}

export const getDateOptionLengthBand = (
  option: Pick<OptionFormat<number>, 'example'>,
): Exclude<DateOptionLengthBand, 'all'> => {
  const length = [...String(option.example || '')].length
  if (length <= 3) return 'short'
  if (length <= 6) return 'medium'
  return 'long'
}

export const filterDateFormatOptions = (
  options: readonly OptionFormat<number>[],
  query: string,
  lengthBand: DateOptionLengthBand,
  appLanguage: AppLanguage,
): OptionFormat<number>[] => {
  const allowed = new Set(getAllowedDateFormatters(appLanguage))
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return options.filter((option) => {
    if (!allowed.has(option.value)) return false
    if (lengthBand !== 'all' && getDateOptionLengthBand(option) !== lengthBand) return false
    if (!normalizedQuery) return true
    return [option.label, option.zhsLabel, option.example]
      .filter(Boolean)
      .some(value => String(value).toLocaleLowerCase().includes(normalizedQuery))
  })
}
