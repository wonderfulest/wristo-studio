import { DateFormatConstants } from '@/config/settings'
import { FontTypes } from '@/config/fonts'

export type DateContentLanguage = 'numeric' | 'en' | 'zh' | 'mixed'

type FontLike = {
  language?: unknown
  type?: unknown
}

const NUMERIC_DATE_FORMATTERS = new Set<number>([
  DateFormatConstants.DD,
  DateFormatConstants.DD_MM_YYYY,
  DateFormatConstants.MM_DD_YYYY,
  DateFormatConstants.YYYY_MM_DD,
  DateFormatConstants.MM_DD,
])

const CHINESE_DATE_FORMATTERS = new Set<number>([
  DateFormatConstants.LUNAR_DATE,
  DateFormatConstants.GANZHI_YEAR,
  DateFormatConstants.ZODIAC_YEAR,
  DateFormatConstants.FESTIVAL_OR_SOLAR_TERM,
  DateFormatConstants.HUANGLI_YI,
  DateFormatConstants.HUANGLI_JI,
  DateFormatConstants.LUNAR_SHICHEN,
  DateFormatConstants.CHINESE_WEEKDAY_SHORT,
  DateFormatConstants.CHINESE_WEEKDAY_LONG,
])

export const DEFAULT_NON_CHINESE_DATE_FORMATTER = DateFormatConstants.MMM_D_DDD

export function getDateContentLanguage(formatter: number | string | null | undefined): DateContentLanguage {
  const value = Number(formatter)
  if (CHINESE_DATE_FORMATTERS.has(value)) return 'zh'
  if (NUMERIC_DATE_FORMATTERS.has(value)) return 'numeric'
  return 'en'
}

export function isChineseDateFormatter(formatter: number | string | null | undefined): boolean {
  return getDateContentLanguage(formatter) === 'zh'
}

export function normalizeDateFormatterForRuntimeLocale(
  formatter: number | string | null | undefined,
  locale: string | null | undefined,
): number {
  const value = Number(formatter)
  const normalizedLocale = String(locale || '').trim().toLowerCase()
  const isChineseLocale = normalizedLocale === 'zh' || normalizedLocale === 'zh-cn' || normalizedLocale === 'zh-tw'
  if (isChineseLocale || !isChineseDateFormatter(value)) return value

  if (
    value === DateFormatConstants.LUNAR_DATE ||
    value === DateFormatConstants.ZODIAC_YEAR ||
    value === DateFormatConstants.FESTIVAL_OR_SOLAR_TERM
  ) {
    return value
  }
  if (value === DateFormatConstants.CHINESE_WEEKDAY_SHORT) return DateFormatConstants.DDD
  if (value === DateFormatConstants.CHINESE_WEEKDAY_LONG) return DateFormatConstants.WEEKDAY_LONG
  return DateFormatConstants.MMM_D
}

export function getDateContentLanguageForRuntimeLocale(
  formatter: number | string | null | undefined,
  locale: string | null | undefined,
): DateContentLanguage {
  const value = Number(formatter)
  const normalizedLocale = String(locale || '').trim().toLowerCase()
  const isChineseLocale = normalizedLocale === 'zh' || normalizedLocale === 'zh-cn' || normalizedLocale === 'zh-tw'
  if (!isChineseLocale && isChineseDateFormatter(value)) return 'en'
  return getDateContentLanguage(normalizeDateFormatterForRuntimeLocale(formatter, locale))
}

export function isDateFormatAllowedByChineseSupport(
  formatter: number | string | null | undefined,
  supportsChineseContent: boolean,
): boolean {
  return supportsChineseContent || !isChineseDateFormatter(formatter)
}

function normalizeLanguage(language: unknown): string {
  return String(language || '').trim().toLowerCase()
}

function normalizeFontType(font: FontLike): string {
  return String((font as any).type || '').trim().toLowerCase()
}

export function isFontCompatibleWithDateLanguage(
  font: FontLike | null | undefined,
  language: DateContentLanguage,
): boolean {
  if (!font) return false

  if (normalizeFontType(font) === FontTypes.ICON_FONT) return false
  if (language === 'numeric') return true

  const fontLanguage = normalizeLanguage((font as any).language)
  if (language === 'en') return fontLanguage === 'en' || fontLanguage === 'multi'
  if (language === 'zh') return fontLanguage === 'zh' || fontLanguage === 'multi'
  return fontLanguage === 'multi'
}

export function getDateFontRequirementLabel(language: DateContentLanguage): string {
  if (language === 'numeric') return 'number or text font'
  if (language === 'en') return 'English or multilingual font'
  if (language === 'zh') return 'Chinese or multilingual font'
  return 'multilingual font'
}
