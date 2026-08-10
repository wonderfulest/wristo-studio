import { describe, expect, it } from 'vitest'

import { getSimulatedDataByName } from './dataSimulator'

describe('sleep data simulation', () => {
  it('keeps configured bedtime distinct from sleep score', () => {
    expect(getSimulatedDataByName('sleep')).toEqual({
      display: '22:30',
      numeric: 81000,
      unit: '',
      label: 'BDTM',
    })
    expect(getSimulatedDataByName('sleepScore')).toEqual({
      display: '86',
      numeric: 86,
      unit: '',
      label: 'SLPS',
    })
  })
})
