import { describe, expect, it } from 'vitest'
import { DateFormatConstants, DateFormatOptions } from '@/config/elements/options/dateFormats'
import type { DataTypeOption } from '@/types/dataCatalog'
import {
  filterDateFormatOptions,
  getCommonDateFormatterValues,
  getDateOptionLengthBand,
  resolveDateFormatterValues,
} from './datePropertyOptions'

const catalogOption = (
  formatterCode: number,
  category: 'date' | 'date_cn',
  systemDefault = 0,
  defaultValue = String(formatterCode),
): DataTypeOption => ({
  valueCode: 2000 + formatterCode,
  formatterCode,
  category,
  metricSymbol: `:DATE_FORMAT_${formatterCode}`,
  settingsLabel: { eng: `Format ${formatterCode}`, zhs: `格式 ${formatterCode}` },
  label: { eng: { short: 'Date', medium: 'Date Fmt', long: 'Date Format' }, zhs: `格式 ${formatterCode}` },
  unitKey: 'none', iconUnicode: '', defaultValue, isActive: 1,
  systemDefault: systemDefault as 0 | 1, sortOrder: formatterCode,
  dialMode: null, dialMin: null, dialMax: null, dialGoalSource: null,
})

const catalog = [
  catalogOption(DateFormatConstants.DD, 'date', 1, 'Sep'),
  catalogOption(DateFormatConstants.DDD, 'date', 1, 'Sep 2023'),
  catalogOption(DateFormatConstants.YYYY_MM_DD, 'date'),
  catalogOption(DateFormatConstants.LUNAR_DATE, 'date_cn', 1, '五月十五'),
  catalogOption(DateFormatConstants.NEXT_SOLAR_TERM, 'date_cn'),
]

describe('date property options', () => {
  it('uses catalog system defaults per application language', () => {
    expect(getCommonDateFormatterValues('eng', catalog)).toEqual([
      DateFormatConstants.DD,
      DateFormatConstants.DDD,
    ])
    expect(getCommonDateFormatterValues('zhs', catalog)).toEqual([
      DateFormatConstants.LUNAR_DATE,
    ])
  })

  it('keeps only 3-to-8-character formats in the default date options', () => {
    const options = [
      catalogOption(100, 'date', 1, '05'),
      catalogOption(101, 'date', 1, 'Mon'),
      catalogOption(102, 'date', 1, 'Sep 2023'),
      catalogOption(103, 'date', 1, 'September'),
    ]

    expect(getCommonDateFormatterValues('eng', options)).toEqual([101, 102])
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
    expect(resolveDateFormatterValues(undefined, 'eng', catalog)).toContain(DateFormatConstants.YYYY_MM_DD)
    expect(resolveDateFormatterValues(undefined, 'eng', catalog)).not.toContain(DateFormatConstants.LUNAR_DATE)
    expect(resolveDateFormatterValues(undefined, 'zhs', catalog)).toContain(DateFormatConstants.LUNAR_DATE)
    expect(resolveDateFormatterValues(undefined, 'zhs', catalog)).not.toContain(DateFormatConstants.YYYY_MM_DD)
  })

  it('normalizes stored values to unique language-allowed formats', () => {
    expect(resolveDateFormatterValues([
      DateFormatConstants.LUNAR_DATE,
      DateFormatConstants.DD,
      DateFormatConstants.DD,
    ], 'eng', catalog)).toEqual([DateFormatConstants.DD])
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
