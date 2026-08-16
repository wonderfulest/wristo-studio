import { DateFormatConstants } from '@/config/elements/options/dateFormats'
import type { AppLanguage } from '@/types/localization'

export type LanguageAwareElementKind = 'text' | 'date' | 'time' | 'icon'

const ENGLISH_DEFAULT_FONT_FAMILY = 'roboto-condensed-regular'
const CHINESE_DEFAULT_FONT_FAMILY = 'noto-sans-sc-regular'

const CHINESE_DATE_FORMATTERS = [
  DateFormatConstants.LUNAR_DATE,
  DateFormatConstants.GANZHI_YEAR,
  DateFormatConstants.ZODIAC_YEAR,
  DateFormatConstants.FESTIVAL_OR_SOLAR_TERM,
  DateFormatConstants.HUANGLI_YI,
  DateFormatConstants.HUANGLI_JI,
  DateFormatConstants.LUNAR_SHICHEN,
  DateFormatConstants.CHINESE_WEEKDAY_SHORT,
  DateFormatConstants.CHINESE_WEEKDAY_LONG,
] as const

const ENGLISH_DATE_FORMATTERS = [
  DateFormatConstants.DD,
  DateFormatConstants.DDD,
  DateFormatConstants.DDDD,
  DateFormatConstants.DO,
  DateFormatConstants.MMM,
  DateFormatConstants.MMMM,
  DateFormatConstants.MMM_D,
  DateFormatConstants.MMMM_D,
  DateFormatConstants.DDD_DD,
  DateFormatConstants.MMM_D_DDD,
  DateFormatConstants.MMM_D_DDDD,
  DateFormatConstants.MMMM_D_DDDD,
  DateFormatConstants.DDDD_MMMM_D,
  DateFormatConstants.MMM_D_YYYY,
  DateFormatConstants.D_MMM_YYYY,
  DateFormatConstants.DD_MM_YYYY,
  DateFormatConstants.MM_DD_YYYY,
  DateFormatConstants.YYYY_MM_DD,
  DateFormatConstants.MMMM_DO_YYYY,
  DateFormatConstants.MMM_D_YYYY_DDDD,
  DateFormatConstants.WEEKDAY_LONG,
  DateFormatConstants.MONTH_LONG,
  DateFormatConstants.MM_DD,
  DateFormatConstants.MM_DD_SLASH,
] as const

export const CHINESE_ONLY_DATA_SYMBOLS = new Set([
  ':FIELD_TYPE_LUNAR_DATE',
  ':FIELD_TYPE_SOLAR_TERM',
  ':FIELD_TYPE_GANZHI_YEAR',
  ':FIELD_TYPE_ZODIAC_YEAR',
  ':FIELD_TYPE_HUANGLI_YI',
  ':FIELD_TYPE_HUANGLI_JI',
  ':FIELD_TYPE_LUNAR_SHICHEN',
])

export function getAllowedFontLanguages(
  appLanguage: AppLanguage,
  kind: LanguageAwareElementKind,
): string[] | undefined {
  if (kind === 'time' || kind === 'icon') return undefined
  return [appLanguage === 'zhs' ? 'zh' : 'en']
}

export function getDefaultFontFamilyForAppLanguage(
  appLanguage: AppLanguage,
  fontFamily: string,
): string {
  if (appLanguage === 'zhs' && fontFamily === ENGLISH_DEFAULT_FONT_FAMILY) {
    return CHINESE_DEFAULT_FONT_FAMILY
  }
  return fontFamily
}

export function getDefaultDateFormatterForAppLanguage(
  appLanguage: AppLanguage,
  formatter: number,
): number {
  return appLanguage === 'zhs' ? DateFormatConstants.LUNAR_DATE : formatter
}

export function getAllowedDateFormatters(appLanguage: AppLanguage): readonly number[] {
  return appLanguage === 'zhs' ? CHINESE_DATE_FORMATTERS : ENGLISH_DATE_FORMATTERS
}

export function isChineseOnlyDataSymbol(metricSymbol: string): boolean {
  return CHINESE_ONLY_DATA_SYMBOLS.has(metricSymbol)
}

export function filterDataOptionsForAppLanguage<T extends { metricSymbol: string; appLanguage?: AppLanguage | null }>(
  options: readonly T[],
  appLanguage: AppLanguage,
): T[] {
  return options.filter((option) => {
    const requiredLanguage = option.appLanguage
      || (isChineseOnlyDataSymbol(option.metricSymbol) ? 'zh' : undefined)
    return !requiredLanguage || requiredLanguage === appLanguage
  })
}
