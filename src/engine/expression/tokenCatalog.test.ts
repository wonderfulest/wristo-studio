import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from './tokenCatalog'

const EXPECTED_CODES = [
  'tm1', 'tm1.1', 'tm2', 'tm3', 'tm4', 'tm5',
  'tm6', 'tm6.1', 'tm6.0', 'tm6.2',
  'tm7.3', 'tm7.4', 'tm7.0', 'tm7.1', 'tm7.2',
  'tm8', 'tm8.0', 'tm8.1', 'tm8.2',
  'tm9', 'tm9.0', 'tm9.3', 'tm9.4',
  'tm10', 'tm11',
  'ai1', 'ai1.1', 'ai1.2', 'ai4', 'ai4.1', 'ai5', 'ai6', 'ai8', 'ai11', 'ai12', 'ai13', 'ai14',
  'ds1', 'ds2', 'ds3', 'ds4', 'ds6', 'ds7', 'ds8', 'ds9', 'ds10', 'ds11', 'ds12', 'ds14', 'ds330', 'ds331',
  'w01', 'w02', 'w03', 'w04', 'w05', 'w06', 'w08', 'w09', 'w10', 'w11', 'w12',
  'cn1', 'cn1.1', 'cn1.2', 'cn1.3', 'cn1.4', 'cn1.5', 'cn1.6', 'cn1.7',
  'cn2', 'cn2.1', 'cn2.2', 'cn2.3', 'cn2.4',
  'cn3', 'cn3.1', 'cn3.2', 'cn3.3', 'cn3.4',
  'cn4', 'cn4.1', 'cn4.2', 'cn4.3',
  'cn5', 'cn5.1', 'cn5.2', 'cn5.3', 'cn5.4', 'cn5.5', 'cn5.6',
  'wr.charging', 'wr.phoneConnected', 'wr.bluetoothConnected', 'wr.dnd',
]

describe('default expression token catalog', () => {
  it('does not expose the redundant complete four-pillars token', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('cn3.5')).toBeUndefined()
  })

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

  it('marks all Chinese calendar tokens as Chinese-only and preserves scalar types', () => {
    for (const code of EXPECTED_CODES.filter((code) => code.startsWith('cn'))) {
      expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(code)).toMatchObject({
        appLanguages: ['zhs'],
      })
    }
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('cn1.3')?.valueType).toBe('number')
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('cn1.7')?.valueType).toBe('boolean')
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('cn2.2')).toMatchObject({
      valueType: 'string',
      exampleValue: '+10',
    })
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('cn2.4')).toMatchObject({
      valueType: 'string',
      exampleValue: '+6',
    })
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('cn2.5')).toBeUndefined()
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

  it('defines nullable and zero-padded time digit tokens distinctly', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('tm6.0')).toMatchObject({
      id: 'time.hour24FirstDigitNullable',
      nullable: true,
      exampleValue: 1,
    })
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('tm6.1')).toMatchObject({
      id: 'time.hour24FirstDigit',
      nullable: false,
      exampleValue: 1,
    })
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('tm9.4')).toMatchObject({
      id: 'time.secondSecondDigit',
      nullable: false,
      updateFrequency: 'second',
      exampleValue: 5,
    })
  })

  it('documents the Connect IQ day-of-week values for tm5', () => {
    const dayOfWeek = DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('tm5')
    expect(dayOfWeek?.enumValues).toEqual([
      { value: 1, label: 'Sunday', labelCn: '周日' },
      { value: 2, label: 'Monday', labelCn: '周一' },
      { value: 3, label: 'Tuesday', labelCn: '周二' },
      { value: 4, label: 'Wednesday', labelCn: '周三' },
      { value: 5, label: 'Thursday', labelCn: '周四' },
      { value: 6, label: 'Friday', labelCn: '周五' },
      { value: 7, label: 'Saturday', labelCn: '周六' },
    ])
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
