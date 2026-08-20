import { describe, expect, it } from 'vitest'
import { decodeLineChart, encodeLineChart } from './lineChart.encoder'

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

  it('preserves independent line and point color bindings', () => {
    const encoded = encodeLineChart({
      id: 'line-chart-bindings',
      eleType: 'lineChart',
      width: 100,
      height: 80,
      color: '#112233',
      colorProperty: 'lineColor',
      pointColor: '#445566',
      pointColorProperty: 'pointColor',
    } as any)

    expect(encoded).toMatchObject({
      color: '#112233',
      colorProperty: 'lineColor',
      pointColor: '#445566',
      pointColorProperty: 'pointColor',
    })
    expect(decodeLineChart(encoded)).toMatchObject({
      colorProperty: 'lineColor',
      pointColorProperty: 'pointColor',
    })
  })
})
