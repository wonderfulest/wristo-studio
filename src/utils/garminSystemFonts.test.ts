import { describe, expect, it } from 'vitest'
import {
  bundledGarminPreviewFamilies,
  isAllowedGarminFontSymbol,
  listGarminSystemFonts,
  resolveGarminSystemFont,
  toGarminFontLiteral,
} from './garminSystemFonts'

describe('Garmin system font resolver', () => {
  it('bundles every browser family returned by the resolver', () => {
    const families = listGarminSystemFonts({
      deviceId: 'venu3',
      partNumber: '006-B4260-00',
      locale: 'zh-CN',
    }).map(font => font.browserFamily).filter(Boolean)
    expect(families.every(family => bundledGarminPreviewFamilies.has(family!))).toBe(true)
  })
  it('resolves Venu 3 Chinese and English faces from SDK language sections', () => {
    expect(resolveGarminSystemFont({
      deviceId: 'venu3',
      partNumber: '006-B4260-00',
      locale: 'zh-CN',
      symbol: 'FONT_SMALL',
    })).toMatchObject({ supported: true, face: 'Noto Sans SC', size: 69, precision: 'exact' })

    expect(resolveGarminSystemFont({
      deviceId: 'venu3',
      partNumber: '006-B4260-00',
      locale: 'en-US',
      symbol: 'FONT_SMALL',
    })).toMatchObject({ supported: true, face: 'Roboto', size: 50, precision: 'exact' })
  })

  it('resolves Japanese, Korean, Thai, and numeric faces', () => {
    expect(resolveGarminSystemFont({ deviceId: 'venu3', locale: 'ja-JP', symbol: 'FONT_SMALL' }).face).toBe('MotoyaLCedar')
    expect(resolveGarminSystemFont({ deviceId: 'venu3', locale: 'ko-KR', symbol: 'FONT_SMALL' }).face).toBe('NanumGothic')
    expect(resolveGarminSystemFont({ deviceId: 'venu3', locale: 'th-TH', symbol: 'FONT_SMALL' }).face).toBe('Pridi')
    expect(resolveGarminSystemFont({ deviceId: 'venu3', locale: 'zh-CN', symbol: 'FONT_NUMBER_HOT' }))
      .toMatchObject({ face: 'Yantramanav', size: 169 })
  })

  it('marks a missing part number as device-default without blocking support', () => {
    expect(resolveGarminSystemFont({
      deviceId: 'fr965',
      partNumber: 'unknown',
      locale: 'en-US',
      symbol: 'FONT_SMALL',
    })).toMatchObject({ supported: true, precision: 'device-default' })
  })

  it('rejects unknown devices, constants, and expression injection', () => {
    expect(resolveGarminSystemFont({ deviceId: 'missing', locale: 'en-US', symbol: 'FONT_SMALL' }))
      .toMatchObject({ supported: false, reason: 'unknown-device' })
    expect(resolveGarminSystemFont({ deviceId: 'venu3', locale: 'en-US', symbol: 'FONT_UNKNOWN' }))
      .toMatchObject({ supported: false, reason: 'invalid-symbol' })
    expect(isAllowedGarminFontSymbol('FONT_SMALL')).toBe(true)
    expect(isAllowedGarminFontSymbol('FONT_SMALL); evil();')).toBe(false)
    expect(() => toGarminFontLiteral('FONT_SMALL); evil();')).toThrow('Invalid Garmin font symbol')
  })

  it('lists each supported symbol once in Garmin order', () => {
    const symbols = listGarminSystemFonts({ deviceId: 'venu3', locale: 'en-US' }).map(item => item.symbol)
    expect(symbols[0]).toBe('FONT_XTINY')
    expect(symbols).toContain('FONT_NUMBER_HOT')
    expect(new Set(symbols).size).toBe(symbols.length)
  })
})
