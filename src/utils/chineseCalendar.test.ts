import { describe, expect, it } from 'vitest'
import {
  formatChineseCulturalDate,
  getChineseFestival,
  getChineseLunarDate,
  getFourPillars,
  getNextSolarTerm,
  getSolarTerm,
} from './chineseCalendar'
import { DateFormatConstants } from '@/config/elements/options/dateFormats'

const localDate = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12)

describe('Chinese festival or solar-term formatter', () => {
  it('shows only the name on Gregorian festival, solar-term, and lunar festival dates', () => {
    expect(formatChineseCulturalDate(localDate(2026, 1, 1), 23, 'zh-CN')).toBe('元旦')
    expect(formatChineseCulturalDate(localDate(2026, 9, 7), 23, 'zh-CN')).toBe('白露')
    expect(getChineseFestival(localDate(2025, 1, 29))).toBe('春节')
    expect(formatChineseCulturalDate(localDate(2025, 1, 29), 23, 'zh-CN')).toBe('春节')
  })

  it('does not project a future event into the today-only formatter', () => {
    expect(formatChineseCulturalDate(localDate(2026, 9, 6), 23, 'zh-CN')).toBe('')
  })

  it('formats next Gregorian festivals and solar terms as content plus distance', () => {
    expect(formatChineseCulturalDate(localDate(2026, 9, 21), DateFormatConstants.NEXT_GREGORIAN_FESTIVAL)).toBe('国庆+10')
    expect(formatChineseCulturalDate(localDate(2026, 10, 1), DateFormatConstants.NEXT_GREGORIAN_FESTIVAL)).toBe('国庆')
    expect(formatChineseCulturalDate(localDate(2026, 8, 17), DateFormatConstants.NEXT_SOLAR_TERM)).toBe('处暑+6')
    expect(formatChineseCulturalDate(localDate(2026, 8, 7), DateFormatConstants.NEXT_SOLAR_TERM)).toBe('立秋')
  })

  it('preserves Gregorian-festival priority and existing English output', () => {
    // 2020-10-01 is both National Day and Mid-Autumn Festival.
    expect(getChineseFestival(localDate(2020, 10, 1))).toBe('国庆节')
    expect(formatChineseCulturalDate(localDate(2025, 12, 31), 23, 'en-US')).toBe('Dec 31')
  })
})

describe('Chinese calendar atomic values', () => {
  it('returns separate lunar year, month, day, and leap-month state', () => {
    expect(getChineseLunarDate(localDate(2025, 1, 29))).toMatchObject({
      year: 2025,
      month: 1,
      day: 1,
      isLeapMonth: false,
      yearName: '二〇二五年',
      monthName: '正月',
      dayName: '初一',
    })
  })

  it('returns no lunar value outside the supported range', () => {
    expect(getChineseLunarDate(localDate(1899, 12, 31))).toBeNull()
    expect(getChineseLunarDate(localDate(2100, 1, 1))).toBeNull()
  })

  it('calculates solar terms per year instead of using fixed dates', () => {
    expect(getSolarTerm(localDate(2026, 8, 7))).toBe('立秋')
    expect(getSolarTerm(localDate(2026, 8, 8))).toBe('')
    expect(getNextSolarTerm(localDate(2026, 8, 8))).toEqual({ name: '处暑', days: 15 })
  })

  it('uses lichun and solar-term boundaries for the four pillars', () => {
    expect(getFourPillars(localDate(2026, 2, 3))).toMatchObject({ year: '乙巳', month: '己丑' })
    expect(getFourPillars(localDate(2026, 2, 5))).toMatchObject({ year: '丙午', month: '庚寅' })
  })

  it('uses civil midnight for the day pillar and two-hour shichen for the hour pillar', () => {
    const late = new Date(2026, 7, 16, 23, 30)
    const midnight = new Date(2026, 7, 17, 0, 0)
    const oneAm = new Date(2026, 7, 17, 1, 0)
    const latePillars = getFourPillars(late)
    const midnightPillars = getFourPillars(midnight)
    const oneAmPillars = getFourPillars(oneAm)

    expect(latePillars.day).not.toBe(midnightPillars.day)
    expect(latePillars.hour.endsWith('子')).toBe(true)
    expect(midnightPillars.hour.endsWith('子')).toBe(true)
    expect(oneAmPillars.hour.endsWith('丑')).toBe(true)
  })
})

describe('expanded Chinese date formatters', () => {
  const date = localDate(2025, 1, 29)

  it('formats separate Gregorian and lunar values', () => {
    expect(formatChineseCulturalDate(date, DateFormatConstants.SOLAR_YEAR_LABEL)).toBe('2025年')
    expect(formatChineseCulturalDate(date, DateFormatConstants.SOLAR_MONTH_ZH)).toBe('一月')
    expect(formatChineseCulturalDate(date, DateFormatConstants.SOLAR_DAY_ZH)).toBe('二十九日')
    expect(formatChineseCulturalDate(date, DateFormatConstants.LUNAR_YEAR)).toBe('二〇二五年')
    expect(formatChineseCulturalDate(date, DateFormatConstants.LUNAR_MONTH)).toBe('正月')
    expect(formatChineseCulturalDate(date, DateFormatConstants.LUNAR_DAY)).toBe('初一')
  })

  it('formats festivals, solar terms, and four pillars independently', () => {
    expect(formatChineseCulturalDate(date, DateFormatConstants.FESTIVAL_OR_SOLAR_TERM)).toBe('春节')
    expect(formatChineseCulturalDate(localDate(2026, 8, 8), DateFormatConstants.NEXT_SOLAR_TERM)).toBe('处暑+15')
  })
})
