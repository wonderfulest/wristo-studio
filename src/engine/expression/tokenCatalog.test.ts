import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from './tokenCatalog'

const EXPECTED_CODES = [
  'tm1', 'tm1.1', 'tm2', 'tm3', 'tm4', 'tm5', 'tm6', 'tm7.3', 'tm7.4', 'tm8', 'tm9', 'tm10', 'tm11',
  'ai1', 'ai1.1', 'ai1.2', 'ai4', 'ai4.1', 'ai5', 'ai6', 'ai8', 'ai11', 'ai12', 'ai13', 'ai14',
  'ds1', 'ds2', 'ds3', 'ds4', 'ds6', 'ds7', 'ds8', 'ds9', 'ds10', 'ds11', 'ds12', 'ds14', 'ds330', 'ds331',
  'w01', 'w02', 'w03', 'w04', 'w05', 'w06', 'w08', 'w09', 'w10', 'w11', 'w12',
  'wr.charging', 'wr.phoneConnected', 'wr.bluetoothConnected', 'wr.dnd',
]

describe('default expression token catalog', () => {
  it('contains the complete first practical scalar token release', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.definitions.map(({ code }) => code)).toEqual(EXPECTED_CODES)
  })

  it('provides complete unique metadata for every supported token', () => {
    const definitions = DEFAULT_EXPRESSION_TOKEN_CATALOG.definitions
    expect(new Set(definitions.map(({ id }) => id)).size).toBe(definitions.length)
    expect(new Set(definitions.map(({ code }) => code)).size).toBe(definitions.length)
    definitions.forEach((definition) => {
      expect(definition.label.trim()).not.toBe('')
      expect(definition.labelCn.trim()).not.toBe('')
      expect(definition.description.trim()).not.toBe('')
      expect(definition.descriptionCn.trim()).not.toBe('')
      expect(definition.category).toMatch(/^(date-time|activity|sensor|system|weather|status)$/)
      expect(['number', 'string', 'boolean']).toContain(definition.valueType)
      expect(definition.supportedTargets).toEqual(['visibility'])
      expect(definition.providerKey.trim()).not.toBe('')
      expect(definition.deviceRequirements.length).toBeGreaterThan(0)
      expect(typeof definition.exampleExpression).toBe('string')
    })
  })

  it('preserves the canonical battery identity', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('ds3')).toMatchObject({
      id: 'system.battery.level',
      valueType: 'number',
      nullable: false,
      unit: '%',
      wfbEquivalent: 'ds3',
    })
  })

  it('exposes w01 as the normalized Wristo weather condition code', () => {
    const weatherCode = DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('w01')
    expect(weatherCode).toMatchObject({
      id: 'weather.current.conditionCode',
      label: 'Weather Code',
      labelCn: '天气代码',
      valueType: 'number',
      exampleValue: 2,
    })
    expect(weatherCode?.enumValues).toHaveLength(14)
    expect(weatherCode?.enumValues?.[0]).toMatchObject({ value: 0, label: 'Clear' })
    expect(weatherCode?.enumValues?.[13]).toMatchObject({ value: 13, label: 'Broken Clouds' })
  })

  it('keeps w02 as the Garmin weather description', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('w02')).toMatchObject({
      id: 'weather.current.conditionText',
      label: 'Condition Text',
      labelCn: '天气状况',
      valueType: 'string',
      exampleValue: 'Partly Cloudy',
    })
  })
})
