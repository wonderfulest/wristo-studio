import { afterEach, describe, expect, it } from 'vitest'
import { getSimulatedDataByName, setDataSimulatorScenario } from './dataSimulator'
import { resolveTokenTemplate, validateTokenTemplate } from '@/engine/expression/textTemplateTokens'
import { getSimulatedDataByTokenCode } from './dataSimulator'
import { formatDataNumberDisplay } from './dataNumberFormat'

const predictions = [
  ['racePredictor5k', '21:48', 1308],
  ['racePredictor10k', '45:30', 2730],
  ['racePredictorHalfMarathon', '1:41:12', 6072],
  ['racePredictorMarathon', '3:32:05', 12725],
] as const

afterEach(() => setDataSimulatorScenario('default'))
describe('race prediction preview', () => {
  it.each(predictions)('keeps %s as a duration even with compact number formatting', (key, display, numeric) => {
    const data = getSimulatedDataByName(key)
    expect(data).toMatchObject({ display, numeric, unit: '' })
    expect(formatDataNumberDisplay(data.display, data.numeric, 3, 4)).toBe(display)
  })
  it.each(predictions)('shows --:-- for missing %s without a numeric zero', (key) => {
    setDataSimulatorScenario('missing-data')
    expect(getSimulatedDataByName(key)).toMatchObject({ display: '--:--', numeric: null, unit: '' })
  })
})

const tokens = ['wr.race5k', 'wr.race10k', 'wr.raceHalf', 'wr.raceFull']
describe('race prediction tokens', () => {
  it.each(tokens)('resolves %s as a duration and as numeric seconds', (code) => {
    const [, display, numeric] = predictions[tokens.indexOf(code)]
    expect(getSimulatedDataByTokenCode(code)).toMatchObject({ display, numeric, unit: '' })
    expect(validateTokenTemplate(`(${code})`)).toEqual([])
    expect(resolveTokenTemplate(`(${code})`)).toBe(display)
    expect(resolveTokenTemplate(`((${code}) / 60).format("%d")`)).toBe(String(Math.floor(numeric / 60)))
  })
  it.each(tokens)('preserves the missing-data placeholder in %s text', (code) => {
    setDataSimulatorScenario('missing-data')
    expect(resolveTokenTemplate(`"Race " + (${code})`, undefined, token => getSimulatedDataByTokenCode(token)?.display)).toBe('Race --:--')
    expect(getSimulatedDataByTokenCode(code)?.numeric).toBeNull()
  })
})
