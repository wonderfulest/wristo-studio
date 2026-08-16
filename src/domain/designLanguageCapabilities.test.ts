import { describe, expect, it } from 'vitest'
import { DateFormatConstants } from '@/config/elements/options/dateFormats'
import {
  getAllowedDateFormatters,
  getDefaultDateFormatterForAppLanguage,
  getDefaultFontFamilyForAppLanguage,
  getAllowedFontLanguages,
  isChineseOnlyDataSymbol,
  filterDataOptionsForAppLanguage,
} from './designLanguageCapabilities'

describe('design language capabilities', () => {
  it('uses Noto Sans SC as the default font for Chinese applications', () => {
    expect(getDefaultFontFamilyForAppLanguage('zhs', 'roboto-condensed-regular'))
      .toBe('noto-sans-sc-regular')
    expect(getDefaultFontFamilyForAppLanguage('eng', 'roboto-condensed-regular'))
      .toBe('roboto-condensed-regular')
  })

  it('defaults newly added Chinese date elements to the lunar date formatter', () => {
    expect(getDefaultDateFormatterForAppLanguage('zhs', DateFormatConstants.MMM_D_DDD))
      .toBe(DateFormatConstants.LUNAR_DATE)
    expect(getDefaultDateFormatterForAppLanguage('eng', DateFormatConstants.MMM_D_DDD))
      .toBe(DateFormatConstants.MMM_D_DDD)
  })

  it('requires Chinese fonts for Chinese text and dates while exempting time and icons', () => {
    expect(getAllowedFontLanguages('zhs', 'text')).toEqual(['zh'])
    expect(getAllowedFontLanguages('zhs', 'date')).toEqual(['zh'])
    expect(getAllowedFontLanguages('zhs', 'time')).toBeUndefined()
    expect(getAllowedFontLanguages('zhs', 'icon')).toBeUndefined()
    expect(getAllowedFontLanguages('eng', 'text')).toEqual(['en'])
  })

  it('offers only Chinese date formats to Chinese designs', () => {
    expect(getAllowedDateFormatters('zhs')).toEqual([
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
    expect(getAllowedDateFormatters('eng')).not.toContain(DateFormatConstants.LUNAR_DATE)
  })

  it('recognizes the seven Chinese-only data items', () => {
    expect(isChineseOnlyDataSymbol(':FIELD_TYPE_LUNAR_DATE')).toBe(true)
    expect(isChineseOnlyDataSymbol(':FIELD_TYPE_HUANGLI_JI')).toBe(true)
    expect(isChineseOnlyDataSymbol(':FIELD_TYPE_HEART_RATE')).toBe(false)
  })

  it('filters Chinese-only data items out of English designs', () => {
    const options = [
      { metricSymbol: ':FIELD_TYPE_HEART_RATE' },
      { metricSymbol: ':FIELD_TYPE_LUNAR_DATE', appLanguage: 'zhs' as const },
    ]
    expect(filterDataOptionsForAppLanguage(options, 'zhs')).toHaveLength(2)
    expect(filterDataOptionsForAppLanguage(options, 'eng').map(({ metricSymbol }) => metricSymbol))
      .toEqual([':FIELD_TYPE_HEART_RATE'])
  })
})
