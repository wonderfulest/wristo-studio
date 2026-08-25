import { describe, expect, it } from 'vitest'
import { getSimulatedDataByTokenCode } from './dataSimulator'

describe('compact token simulation', () => {
  it('resolves ds9 through the same heart-rate meaning as Connect IQ', () => {
    const heartRate = getSimulatedDataByTokenCode('ds9')

    expect(heartRate).toMatchObject({ display: '78', numeric: 78, unit: 'bpm' })
  })

  it('simulates ds15 as a numeric heart-rate zone', () => {
    expect(getSimulatedDataByTokenCode('ds15')).toMatchObject({ display: '3', numeric: 3, unit: '' })
  })
})
