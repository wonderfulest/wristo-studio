import { describe, expect, it } from 'vitest'
import { formatChineseCulturalDate, getChineseFestival } from './chineseCalendar'

const localDate = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12)

describe('Chinese festival or solar-term formatter', () => {
  it('shows only the name on Gregorian festival, solar-term, and lunar festival dates', () => {
    expect(formatChineseCulturalDate(localDate(2026, 1, 1), 23, 'zh-CN')).toBe('元旦')
    expect(formatChineseCulturalDate(localDate(2026, 9, 8), 23, 'zh-CN')).toBe('白露')
    expect(getChineseFestival(localDate(2025, 1, 29))).toBe('春节')
    expect(formatChineseCulturalDate(localDate(2025, 1, 29), 23, 'zh-CN')).toBe('春节')
  })

  it('shows the nearest combined event with a one-based day distance', () => {
    expect(formatChineseCulturalDate(localDate(2026, 9, 7), 23, 'zh-CN')).toBe('白露+1')
  })

  it('crosses month and year boundaries', () => {
    expect(formatChineseCulturalDate(localDate(2026, 4, 30), 23, 'zh-CN')).toBe('劳动节+1')
    expect(formatChineseCulturalDate(localDate(2025, 12, 31), 23, 'zh-CN')).toBe('元旦+1')
  })

  it('preserves Gregorian-festival priority and existing English output', () => {
    // 2020-10-01 is both National Day and Mid-Autumn Festival.
    expect(getChineseFestival(localDate(2020, 10, 1))).toBe('国庆节')
    expect(formatChineseCulturalDate(localDate(2025, 12, 31), 23, 'en-US')).toBe('Dec 31')
  })
})
