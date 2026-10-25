import { describe, expect, it } from 'vitest'
import { formatFaceDate } from './faceDate'

describe('face update date in the viewer timezone', () => {
  it('converts offset-free UTC timestamps across date boundaries', () => {
    for (const value of ['2026-10-26T00:30:00', '2026-10-26 00:30:00', '2026-10-26T00:30:00Z']) {
      expect(formatFaceDate(value, 'en-US', 'America/Los_Angeles')).toBe('Oct 25, 2026')
      expect(formatFaceDate(value, 'en-US', 'Asia/Shanghai')).toBe('Oct 26, 2026')
    }
  })
  it('preserves explicit offsets and handles daylight saving time', () => {
    expect(formatFaceDate('2026-07-01T07:30:00+08:00', 'en-US', 'Asia/Shanghai')).toBe('Jul 1, 2026')
    expect(formatFaceDate('2026-07-01T07:30:00+08:00', 'en-US', 'America/Los_Angeles')).toBe('Jun 30, 2026')
  })
  it('defaults to the browser timezone independently of display language', () => {
    const expected = new Date('2026-10-26T00:30:00Z').toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' })
    expect(formatFaceDate('2026-10-26 00:30:00', 'zh-CN')).toBe(expected)
  })
  it('hides missing and invalid values', () => {
    for (const value of [null, undefined, '', ' ', 'invalid']) expect(formatFaceDate(value, 'en-US')).toBe('')
  })
})
