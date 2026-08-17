import { describe, expect, it } from 'vitest'
import { DateFormatConstants, DateFormatOptions } from '@/config/elements/options/dateFormats'
import {
  filterDateFormatOptions,
  getCommonDateFormatterValues,
  getDateOptionLengthBand,
  resolveDateFormatterValues,
} from './datePropertyOptions'

describe('date property options', () => {
  it('provides no more than eight curated defaults per application language', () => {
    expect(getCommonDateFormatterValues('eng')).toEqual([
      DateFormatConstants.DD,
      DateFormatConstants.DDD,
      DateFormatConstants.MMM_D,
      DateFormatConstants.MMMM_D,
      DateFormatConstants.MMM_D_YYYY,
      DateFormatConstants.DD_MM_YYYY,
      DateFormatConstants.MM_DD_YYYY,
      DateFormatConstants.YYYY_MM_DD,
    ])
    expect(getCommonDateFormatterValues('zhs')).toEqual([
      DateFormatConstants.SOLAR_MONTH_DAY,
      DateFormatConstants.SOLAR_MONTH_DAY_ZH,
      DateFormatConstants.LUNAR_DATE,
      DateFormatConstants.LUNAR_MONTH,
      DateFormatConstants.LUNAR_DAY,
      DateFormatConstants.FESTIVAL_OR_SOLAR_TERM,
      DateFormatConstants.NEXT_GREGORIAN_FESTIVAL,
      DateFormatConstants.NEXT_SOLAR_TERM,
    ])
  })

  it('exposes exactly three festival and solar-term options', () => {
    expect(DateFormatOptions.filter(option => [
      '下一个公历节日',
      '节日节气',
      '下一个节气',
    ].includes(option.zhsLabel || '')).map(option => option.value)).toEqual([
      DateFormatConstants.FESTIVAL_OR_SOLAR_TERM,
      DateFormatConstants.NEXT_GREGORIAN_FESTIVAL,
      DateFormatConstants.NEXT_SOLAR_TERM,
    ])
  })

  it('keeps legacy dates compatible with all language-allowed formats', () => {
    expect(resolveDateFormatterValues(undefined, 'eng')).toContain(DateFormatConstants.YYYY_MM_DD)
    expect(resolveDateFormatterValues(undefined, 'eng')).not.toContain(DateFormatConstants.LUNAR_DATE)
    expect(resolveDateFormatterValues(undefined, 'zhs')).toContain(DateFormatConstants.LUNAR_DATE)
    expect(resolveDateFormatterValues(undefined, 'zhs')).not.toContain(DateFormatConstants.YYYY_MM_DD)
  })

  it('normalizes stored values to unique language-allowed formats', () => {
    expect(resolveDateFormatterValues([
      DateFormatConstants.LUNAR_DATE,
      DateFormatConstants.DD,
      DateFormatConstants.DD,
    ], 'eng')).toEqual([DateFormatConstants.DD])
  })

  it('classifies and filters options by example character length', () => {
    expect(getDateOptionLengthBand({ example: '05' })).toBe('short')
    expect(getDateOptionLengthBand({ example: 'Sep 5' })).toBe('medium')
    expect(getDateOptionLengthBand({ example: '2023-09-05' })).toBe('long')
    expect(filterDateFormatOptions(DateFormatOptions, '', 'short', 'eng').every(
      option => [...option.example].length <= 3,
    )).toBe(true)
  })
})
