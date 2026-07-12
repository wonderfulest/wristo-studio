import { describe, expect, it } from 'vitest'
import { normalizeChartSize } from './chartSize'

describe('normalizeChartSize', () => {
  it('applies independent Fabric scales to bar chart dimensions', () => {
    expect(normalizeChartSize('barChart', 120, 80, 1.5, 0.5)).toEqual({
      width: 180,
      height: 40,
    })
  })

  it('clamps bar and line charts to their own limits', () => {
    expect(normalizeChartSize('barChart', 10, 500, 1, 1)).toEqual({
      width: 60,
      height: 227,
    })
    expect(normalizeChartSize('lineChart', 10, 10, 1, 1)).toEqual({
      width: 50,
      height: 20,
    })
  })

  it('falls back to scale one for invalid scale values', () => {
    expect(normalizeChartSize('lineChart', 100, 40, Number.NaN, 0)).toEqual({
      width: 100,
      height: 40,
    })
  })
})
