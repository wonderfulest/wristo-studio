import { describe, expect, it } from 'vitest'
import { getSimulatedDataByTokenCode, setDataSimulatorScenario } from './dataSimulator'

describe('compact token simulation', () => {
  it('resolves running and cycling VO2 tokens and their units', () => {
    expect(getSimulatedDataByTokenCode('wr.vo2Running')).toMatchObject({ numeric: 52, unit: 'ml/kg/min' })
    expect(getSimulatedDataByTokenCode('wr.vo2Cycling')).toMatchObject({ numeric: 55, unit: 'ml/kg/min' })
    for (const code of ['wr.vo2Running', 'wr.vo2Cycling']) {
      expect(getSimulatedDataByTokenCode(`${code}u`)?.display).toBe('ml/kg/min')
    }
  })

  it('reads units from the same simulation as their values', () => {
    for (const code of ['w10', 'w03', 'w04', 'w05', 'ds8', 'ds12', 'ai5', 'w12', 'ds9', 'ai6', 'ai4', 'ds11']) {
      expect(getSimulatedDataByTokenCode(`${code}u`)).toMatchObject({
        display: getSimulatedDataByTokenCode(code)?.unit, numeric: null, unit: '',
      })
    }
  })

  it('matches provider display units rather than canonical logic units', () => {
    expect(getSimulatedDataByTokenCode('ai4u')?.display).toBe('CAL')
    expect(getSimulatedDataByTokenCode('ds11u')?.display).toBe('hPa')
    expect(getSimulatedDataByTokenCode('as2.6u')?.display).toBe('deg')
  })

  it('clears the unit when the corresponding simulated value has no unit', () => {
    setDataSimulatorScenario('missing-data')
    try {
      expect(getSimulatedDataByTokenCode('w10u')?.display).toBe('')
    } finally {
      setDataSimulatorScenario('default')
    }
  })

  it('resolves ds9 through the same heart-rate meaning as Connect IQ', () => {
    const heartRate = getSimulatedDataByTokenCode('ds9')

    expect(heartRate).toMatchObject({ display: '78', numeric: 78, unit: 'bpm' })
  })

  it('simulates ds15 as a numeric heart-rate zone', () => {
    expect(getSimulatedDataByTokenCode('ds15')).toMatchObject({ display: '3', numeric: 3, unit: '' })
  })
})
