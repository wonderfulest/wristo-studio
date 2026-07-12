import { describe, expect, it } from 'vitest'
import { encodeBarChart } from './barChart.encoder'

describe('encodeBarChart', () => {
  it('encodes the displayed size while Fabric scaling is still active', () => {
    const encoded = encodeBarChart({
      id: 'bar-chart-test',
      eleType: 'barChart',
      left: 10,
      top: 20,
      originX: 'center',
      originY: 'center',
      width: 100,
      height: 80,
      scaleX: 1.5,
      scaleY: 0.5,
      chartProperty: 'steps',
      barWidth: 6,
      colors: ['#000000', '#111111', '#222222', '#333333', '#444444'],
    } as any)

    expect(encoded).toMatchObject({ width: 150, height: 40 })
  })
})
