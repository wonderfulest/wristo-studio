import { describe, expect, it } from 'vitest'
import { decodeWeather } from './weather.encoder'
import { weatherSchema } from './weather.schema'

describe('weather font encoding', () => {
  it('restores the schema font when a new weather element has no fontFamily', () => {
    const decoded = decodeWeather({
      eleType: 'weather',
      id: 'weather',
      left: 120,
      top: 160,
      fill: '#FFFFAA',
      fontSize: 42,
    } as any)

    expect(decoded.fontFamily).toBe(weatherSchema.defaultConfig.fontFamily)
  })

  it('replaces a non-weather icon code with the default weather icon', () => {
    const decoded = decodeWeather({
      eleType: 'weather',
      id: 'invalid-weather-icon',
      iconUnicode: '0030',
    } as any)

    expect((decoded as any).iconUnicode).toBe('101d')
  })
})
