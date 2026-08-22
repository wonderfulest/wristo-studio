import { describe, expect, it } from 'vitest'
import { FontTypes } from '@/config/fonts'
import { TimeFormatConstants } from '@/config/elements/options/timeFormats'
import { resolvePrimaryTimeFontType, resolveTimeFontTypes } from './timeFontTypes'

describe('time font type queries', () => {
  it('lets numeric time formats query number and ordinary text fonts', () => {
    expect(resolveTimeFontTypes([TimeFormatConstants.HH_MM])).toEqual([
      FontTypes.NUMBER_FONT,
      FontTypes.TEXT_FONT,
    ])
    expect(resolvePrimaryTimeFontType([TimeFormatConstants.HH_MM])).toBe(FontTypes.NUMBER_FONT)
  })

  it.each([TimeFormatConstants.A, TimeFormatConstants.a])(
    'limits AM/PM formatter %s to ordinary text fonts',
    (formatter) => {
      expect(resolveTimeFontTypes([formatter])).toEqual([FontTypes.TEXT_FONT])
      expect(resolvePrimaryTimeFontType([formatter])).toBe(FontTypes.TEXT_FONT)
    },
  )

  it('uses the safe text-only intersection when a group contains AM/PM', () => {
    expect(resolveTimeFontTypes([TimeFormatConstants.HH_MM, TimeFormatConstants.A])).toEqual([
      FontTypes.TEXT_FONT,
    ])
  })
})
