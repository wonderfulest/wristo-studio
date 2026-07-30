import { describe, expect, it } from 'vitest'
import { TimeFormatConstants } from '@/config/elements/options/timeFormats'
import { formatTimePreview, normalizeHourFormatRenderConfig } from './formatTimePreview'

describe('formatTimePreview', () => {
  it('previews the hour format indicator as 24H', () => {
    expect(formatTimePreview(new Date('2026-07-30T12:34:56.000Z'), TimeFormatConstants.HOUR_FORMAT)).toBe('24H')
  })

  it('normalizes an invalid Bitmap hour format config to TrueType', () => {
    expect(
      normalizeHourFormatRenderConfig({
        formatter: TimeFormatConstants.HOUR_FORMAT,
        fontRenderType: 'bitmap'
      })
    ).toMatchObject({
      fontRenderType: 'truetype',
      fontFamily: 'roboto-condensed-regular'
    })
  })
})
