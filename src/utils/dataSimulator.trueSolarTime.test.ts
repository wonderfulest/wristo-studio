import { describe, expect, it } from 'vitest'
import { getSimulatedDataByName } from './dataSimulator'

describe('true solar time simulation', () => {
  it('provides a recognizable time preview', () => {
    expect(getSimulatedDataByName('trueSolarTime')).toEqual({
      display: '12:07',
      unit: '',
      label: 'SOLAR',
    })
  })
})
