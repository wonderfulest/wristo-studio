import { describe, expect, it } from 'vitest'
import { encodeLineChart } from './lineChart.encoder'

describe('encodeLineChart', () => {
  it('encodes the displayed size while Fabric scaling is still active', () => {
    const encoded = encodeLineChart({
      id: 'line-chart-test',
      eleType: 'lineChart',
      left: 10,
      top: 20,
      originX: 'center',
      originY: 'center',
      width: 100,
      height: 80,
      scaleX: 2,
      scaleY: 0.5,
      chartProperty: 'steps',
      color: '#ffffff',
      lineWidth: 2,
      showPoints: true,
      pointColor: '#ffffff',
      pointRadius: 2,
    } as any)

    expect(encoded).toMatchObject({ width: 200, height: 40 })
  })
})
