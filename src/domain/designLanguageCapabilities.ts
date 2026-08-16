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
  DateFormatConstants.SOLAR_YEAR_LABEL,
  DateFormatConstants.SOLAR_MONTH_LABEL,
  DateFormatConstants.SOLAR_MONTH_ZH,
  DateFormatConstants.SOLAR_DAY_LABEL,
  DateFormatConstants.SOLAR_DAY_ZH,
  DateFormatConstants.SOLAR_MONTH_DAY,
  DateFormatConstants.SOLAR_MONTH_DAY_ZH,
  DateFormatConstants.LUNAR_YEAR,
  DateFormatConstants.LUNAR_MONTH,
  DateFormatConstants.LUNAR_DAY,
  DateFormatConstants.LUNAR_MONTH_PREFIX,
  DateFormatConstants.SOLAR_FESTIVAL,
  DateFormatConstants.LUNAR_FESTIVAL,
  DateFormatConstants.SOLAR_TERM,
  DateFormatConstants.NEXT_FESTIVAL,
  DateFormatConstants.NEXT_FESTIVAL_WITH_DAYS,
  DateFormatConstants.NEXT_SOLAR_TERM,
  DateFormatConstants.NEXT_SOLAR_TERM_WITH_DAYS,
  DateFormatConstants.ZODIAC,
  DateFormatConstants.SHICHEN_BRANCH,
  DateFormatConstants.FOUR_PILLAR_YEAR,
  DateFormatConstants.FOUR_PILLAR_MONTH,
  DateFormatConstants.FOUR_PILLAR_DAY,
  DateFormatConstants.FOUR_PILLAR_HOUR,
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
  ':FIELD_TYPE_LUNAR_YEAR',
  ':FIELD_TYPE_LUNAR_YEAR_TEXT',
  ':FIELD_TYPE_LUNAR_MONTH',
  ':FIELD_TYPE_LUNAR_MONTH_TEXT',
  ':FIELD_TYPE_LUNAR_DAY',
  ':FIELD_TYPE_LUNAR_DAY_TEXT',
  ':FIELD_TYPE_LUNAR_IS_LEAP',
  ':FIELD_TYPE_FESTIVAL_TODAY',
  ':FIELD_TYPE_SOLAR_FESTIVAL',
  ':FIELD_TYPE_LUNAR_FESTIVAL',
  ':FIELD_TYPE_NEXT_FESTIVAL',
  ':FIELD_TYPE_NEXT_FESTIVAL_DAYS',
  ':FIELD_TYPE_NEXT_SOLAR_TERM',
  ':FIELD_TYPE_NEXT_SOLAR_TERM_DAYS',
  ':FIELD_TYPE_FOUR_PILLAR_YEAR',
  ':FIELD_TYPE_FOUR_PILLAR_MONTH',
  ':FIELD_TYPE_FOUR_PILLAR_DAY',
  ':FIELD_TYPE_FOUR_PILLAR_HOUR',
  ':FIELD_TYPE_ZODIAC_NAME',
  ':FIELD_TYPE_SHICHEN_BRANCH',
  ':FIELD_TYPE_SOLAR_YEAR_TEXT',
  ':FIELD_TYPE_SOLAR_MONTH_TEXT',
  ':FIELD_TYPE_SOLAR_MONTH_ZH',
  ':FIELD_TYPE_SOLAR_DAY_TEXT',
  ':FIELD_TYPE_SOLAR_DAY_ZH',
  ':FIELD_TYPE_WEEKDAY_SHORT_ZH',
  ':FIELD_TYPE_WEEKDAY_LONG_ZH',
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
