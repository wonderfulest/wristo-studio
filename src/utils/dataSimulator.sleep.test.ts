import { describe, expect, it } from 'vitest'

import { getSimulatedDataByName, setDataSimulatorScenario } from './dataSimulator'

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

describe('verification data scenarios', () => {
  it('uses a low battery value while the low-battery scenario is selected', () => {
    setDataSimulatorScenario('low-battery')
    expect(getSimulatedDataByName('battery')).toMatchObject({ display: '12', numeric: 12 })
    setDataSimulatorScenario('default')
  })

  it('shows unavailable values while the missing-data scenario is selected', () => {
    setDataSimulatorScenario('missing-data')
    expect(getSimulatedDataByName('hr')).toMatchObject({ display: '--', numeric: null })
    setDataSimulatorScenario('default')
  })
})
