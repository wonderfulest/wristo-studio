import { describe, expect, it } from 'vitest'
import { normalizeWeatherIconCode, isWeatherIconCode } from './weatherCodes'

describe('weather icon codes', () => {
  it('keeps canonical weather codes', () => {
    expect(normalizeWeatherIconCode('101d')).toBe('101d')
    expect(normalizeWeatherIconCode('110E')).toBe('110e')
  })

  it('rejects data icon codes instead of rendering them as weather', () => {
    expect(isWeatherIconCode('0030')).toBe(false)
    expect(normalizeWeatherIconCode('0030')).toBe('101d')
  })
})
