import { describe, expect, it } from 'vitest'
import { normalizeSecondTimeZone, secondTimeZoneLabel, secondTimeZoneTime } from './secondTimeZone'

describe('second timezone', () => {
  it('follows both New York DST transitions', () => {
    const config = { city: 10 }
    expect(secondTimeZoneTime(config, new Date('2026-03-08T06:59:00Z'))).toBe('01:59')
    expect(secondTimeZoneTime(config, new Date('2026-03-08T07:00:00Z'))).toBe('03:00')
    expect(secondTimeZoneTime(config, new Date('2026-11-01T05:59:00Z'))).toBe('01:59')
    expect(secondTimeZoneTime(config, new Date('2026-11-01T06:00:00Z'))).toBe('01:00')
  })
  it('uses southern hemisphere DST and fractional fixed offsets', () => {
    expect(secondTimeZoneTime({ city: 15 }, new Date('2026-01-01T00:00:00Z'))).toBe('11:00')
    expect(secondTimeZoneTime({ city: 15 }, new Date('2026-07-01T00:00:00Z'))).toBe('10:00')
    expect(secondTimeZoneTime({ city: 17, offsetMinutes: 345 }, new Date('2026-01-01T23:30:00Z'))).toBe('05:15')
  })
  it('handles midnight, noon, system format and dynamic labels', () => {
    expect(secondTimeZoneTime({ format: 2 }, new Date('2026-01-01T00:00:00Z'))).toBe('12:00 AM')
    expect(secondTimeZoneTime({ format: 0 }, new Date('2026-01-01T12:00:00Z'), true)).toBe('12:00 PM')
    expect(secondTimeZoneLabel({ city: 10 })).toBe('NYC')
    expect(secondTimeZoneLabel({ city: 17, offsetMinutes: 540 })).toBe('UTC+9')
    expect(secondTimeZoneLabel({ city: 17, offsetMinutes: 345 })).toBe('UTC+5:45')
    expect(secondTimeZoneLabel({ city: 17, offsetMinutes: -210 })).toBe('UTC-3:30')
    expect(secondTimeZoneLabel({ label: 'ab 中文+12x' })).toBe('AB+12')
  })
  it('normalizes defaults and limits', () => {
    expect(normalizeSecondTimeZone({ offsetMinutes: 359 }).offsetMinutes).toBe(345)
    expect(normalizeSecondTimeZone({ offsetMinutes: -359 }).offsetMinutes).toBe(-345)
    expect(normalizeSecondTimeZone()).toEqual({ city: 0, offsetMinutes: 0, label: '', format: 1 })
    expect(normalizeSecondTimeZone({ city: 99, offsetMinutes: 9999, format: 9 })).toEqual({ city: 0, offsetMinutes: 840, label: '', format: 1 })
  })
})
