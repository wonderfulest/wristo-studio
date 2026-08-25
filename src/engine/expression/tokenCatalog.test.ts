import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from './tokenCatalog'

const EXPECTED_CODES = [
  'dt1', 'dt1.1', 'dt2', 'dt2.1', 'dt2.2', 'dt3', 'dt4', 'dt5', 'dt5.1', 'dt5.2', 'dt6',
  'tm1', 'tm1.1', 'tm2', 'tm3', 'tm4', 'tm5',
  'tm6', 'tm6.1', 'tm6.0', 'tm6.2',
  'tm7.3', 'tm7.4', 'tm7.0', 'tm7.1', 'tm7.2',
  'tm8', 'tm8.0', 'tm8.1', 'tm8.2',
  'tm9', 'tm9.0', 'tm9.3', 'tm9.4',
  'tm10', 'tm11',
  'ai1', 'ai1.1', 'ai1.2', 'ai4', 'ai4.1', 'ai5', 'ai6', 'ai8', 'ai11', 'ai12', 'ai13', 'ai14',
  'ds1', 'ds2', 'ds3', 'ds4', 'ds6', 'ds7', 'ds8', 'ds9', 'ds10', 'ds11', 'ds12', 'ds14', 'ds15', 'ds330', 'ds331',
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

  it('documents every move-bar level exposed by ai11', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('ai11')).toMatchObject({
      id: 'activity.moveBarLevel',
      description: 'Garmin move-bar alert level: 0 before 60 inactive minutes; level 1 at 60 minutes; then one additional level every 15 minutes until level 5 at 120 minutes.',
      descriptionCn: 'Garmin 久坐提醒等级：静止不足 60 分钟返回 0；60 分钟进入 1 级；之后每 15 分钟增加一级，120 分钟及以上为 5 级。',
      enumValues: [
        { value: 0, label: 'No alert (under 60 min)', labelCn: '无久坐提醒（不足 60 分钟）' },
        { value: 1, label: 'First bar (60–74 min)', labelCn: '一级久坐提醒（60–74 分钟）' },
        { value: 2, label: 'Two bars (75–89 min)', labelCn: '二级久坐提醒（75–89 分钟）' },
        { value: 3, label: 'Three bars (90–104 min)', labelCn: '三级久坐提醒（90–104 分钟）' },
        { value: 4, label: 'Four bars (105–119 min)', labelCn: '四级久坐提醒（105–119 分钟）' },
        { value: 5, label: 'Full move bar (120+ min)', labelCn: '完整久坐提醒（120 分钟及以上）' },
      ],
    })
  })

  it('exposes ds15 as the documented current heart-rate zone', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('ds15')).toMatchObject({
      id: 'sensor.heartRateZone',
      label: 'Heart Rate Zone',
      labelCn: '心率区间',
      valueType: 'number',
      nullable: false,
      exampleValue: 3,
      description: 'Current generic-sport heart-rate zone using the user’s Garmin thresholds: 0 when heart rate or zone data is unavailable, or below the Zone 1 threshold; 1–4 between adjacent zone thresholds; 5 at or above the Zone 5 threshold.',
      descriptionCn: '使用 Garmin 用户“通用运动”心率区间阈值计算：无有效心率或区间数据、或心率低于 Z1 下限时返回 0；位于相邻区间阈值之间时返回 1–4；达到或超过 Z5 下限时返回 5。',
      enumValues: [
        { value: 0, label: 'No valid zone or below Zone 1', labelCn: '无有效区间或低于 Z1 下限' },
        { value: 1, label: 'Zone 1: Z1 threshold to below Z2', labelCn: 'Z1：达到 Z1 下限且低于 Z2 下限' },
        { value: 2, label: 'Zone 2: Z2 threshold to below Z3', labelCn: 'Z2：达到 Z2 下限且低于 Z3 下限' },
        { value: 3, label: 'Zone 3: Z3 threshold to below Z4', labelCn: 'Z3：达到 Z3 下限且低于 Z4 下限' },
        { value: 4, label: 'Zone 4: Z4 threshold to below Z5', labelCn: 'Z4：达到 Z4 下限且低于 Z5 下限' },
        { value: 5, label: 'Zone 5: at or above the Z5 threshold', labelCn: 'Z5：达到或超过 Z5 下限' },
      ],
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
