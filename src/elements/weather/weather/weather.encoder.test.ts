import { describe, expect, it } from 'vitest'
import { decodeWeather } from './weather.encoder'
import { weatherSchema } from './weather.schema'

describe('weather decoder compatibility', () => {
  it('restores the schema font for legacy weather elements without fontFamily', () => {
    const decoded = decodeWeather({
      eleType: 'weather',
      id: 'legacy-weather',
      left: 120,
      top: 160,
      fill: '#FFFFAA',
      fontSize: 42,
    } as any)

    expect(decoded.fontFamily).toBe(weatherSchema.defaultConfig.fontFamily)
  })
})
