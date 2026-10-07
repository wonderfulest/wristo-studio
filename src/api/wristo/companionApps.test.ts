import { describe, expect, it, vi } from 'vitest'
vi.mock('@/config/axios', () => ({ default: { get: vi.fn() } }))
import { parseCompanionApps } from './companionApps'
describe('companion app configuration', () => {
  it('accepts an unconfigured system', () => {
    expect(parseCompanionApps()).toEqual({ ios: '', android: '', iosAlternatives: [], androidAlternatives: [] })
  })
  it('preserves store query parameters and normalizes alternative lines', () => {
    const url = 'https://play.google.com/store/apps/details?id=io.wristo.garmin&hl=en'
    expect(parseCompanionApps(JSON.stringify({ android: url, iosAlternatives: [' ', ' https://wristo.io/app ', 'https://wristo.io/app'] }))).toEqual({ ios: '', android: url, iosAlternatives: ['https://wristo.io/app'], androidAlternatives: [] })
  })
  it.each(['null', '[]', '{', '{"ios":"javascript:alert(1)"}', '{"androidAlternatives":"https://wristo.io"}', '{"ios":"https://user:pass@wristo.io"}'])('rejects invalid configuration %s', raw => {
    expect(() => parseCompanionApps(raw)).toThrow()
  })
})
