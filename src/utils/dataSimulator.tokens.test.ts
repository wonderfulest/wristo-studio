import { describe, expect, it } from 'vitest'
import { getSimulatedDataByTokenCode, setDataSimulatorScenario } from './dataSimulator'

describe('compact token simulation', () => {
  it('previews native weather tokens and preserves missing values', () => {
    expect(getSimulatedDataByTokenCode('w02', 'zhs')?.display).toBe('局部多云')
    expect(getSimulatedDataByTokenCode('w02', 'eng')?.display).toBe('Sunny')
    const codes = ['w02', 'w09', 'w11', 'w11.1', 'w13', 'w14', 'w15', 'w16', 'w17']
    for (const code of codes) expect(getSimulatedDataByTokenCode(code)?.display).toBeTruthy()
    expect(getSimulatedDataByTokenCode('w13')).toMatchObject({ display: '40', numeric: 40, unit: '%' })
    expect(getSimulatedDataByTokenCode('w15')).toMatchObject({ display: '1013', numeric: 101325, unit: 'hPa' })
    for (const code of ['w13', 'w14', 'w15', 'w17']) {
      expect(getSimulatedDataByTokenCode(`${code}u`)?.display).toBe(getSimulatedDataByTokenCode(code)?.unit)
    }
    setDataSimulatorScenario('missing-data')
    try {
      for (const code of codes) expect(getSimulatedDataByTokenCode(code)).toMatchObject({ display: '--', numeric: null })
    } finally { setDataSimulatorScenario('default') }
  })

  it('resolves recovery hours and units, preserving missing data', () => {
    expect(getSimulatedDataByTokenCode('ds332')).toMatchObject({ display: '24', numeric: 24, unit: 'h' })
    expect(getSimulatedDataByTokenCode('ds332u')?.display).toBe('h')
    setDataSimulatorScenario('missing-data')
    try {
      expect(getSimulatedDataByTokenCode('ds332')).toMatchObject({ display: '--', numeric: null })
    } finally {
      setDataSimulatorScenario('default')
    }
  })

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
