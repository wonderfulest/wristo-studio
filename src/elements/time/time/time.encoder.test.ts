// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { TimeFormatConstants } from '@/config/elements/options/timeFormats'
import { encodeTime, decodeTime } from './time.encoder'

const baseElement = {
  id: 'time-1',
  eleType: 'time',
  left: 100,
  top: 120,
  originX: 'center',
  originY: 'center',
  fontSize: 30,
  fill: '#ffffff',
  bitmapFontId: 42,
  fontGap: 4
}

describe('encodeTime', () => {
  it('preserves Bitmap rendering for supported time formats', () => {
    const encoded = encodeTime({
      ...baseElement,
      formatter: TimeFormatConstants.HH_MM,
      fontRenderType: 'bitmap'
    } as any)

    expect(encoded.fontRenderType).toBe('bitmap')
    expect(encoded.bitmapFontId).toBe(42)
  })

  it('normalizes the hour format indicator to TrueType', () => {
    const encoded = encodeTime({
      ...baseElement,
      formatter: TimeFormatConstants.HOUR_FORMAT,
      fontRenderType: 'bitmap'
    } as any)

    expect(encoded.fontRenderType).toBe('truetype')
    expect(encoded).not.toHaveProperty('bitmapFontId')
    expect(encoded.fontFamily).toBe('roboto-condensed-regular')
  })
})

it('removes stale bitmap references when saving and loading TrueType time', () => {
  const legacy = { ...baseElement, formatter: 0, fontRenderType: 'truetype' } as any
  expect(encodeTime(legacy)).not.toHaveProperty('bitmapFontId')
  expect(decodeTime(legacy)).not.toHaveProperty('bitmapFontId')
})
