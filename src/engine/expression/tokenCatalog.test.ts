import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from './tokenCatalog'

const EXPECTED_CODES = [
  'dt1', 'dt1.1', 'dt2.1', 'dt2.2', 'dt3', 'dt4', 'dt5', 'dt5.1', 'dt5.2', 'dt6',
  'tm1', 'tm1.1', 'tm2', 'tm3', 'tm4', 'tm5',
  'tm6', 'tm6.1', 'tm6.0', 'tm6.2',
  'tm7.3', 'tm7.4', 'tm7.0', 'tm7.1', 'tm7.2',
  'tm8', 'tm8.0', 'tm8.1', 'tm8.2',
  'tm9', 'tm9.0', 'tm9.3', 'tm9.4',
  'tm10', 'tm10.1', 'tm11',
  'as1', 'as1.1', 'as1.2',
  'as2', 'as2.1', 'as2.2', 'as2.3', 'as2.4', 'as2.5', 'as2.6', 'as2.7',
  'ai1', 'ai1.1', 'ai1.2', 'ai4', 'ai4.1', 'ai5', 'ai6', 'ai8', 'ai11', 'ai12', 'ai13', 'ai14',
  'ds1', 'ds2', 'ds3', 'ds3.1', 'ds3.3', 'ds4', 'ds6', 'ds7', 'ds8', 'ds9', 'ds10', 'ds11', 'ds12', 'ds14', 'ds15', 'ds330', 'ds330.1', 'ds331', 'ds331.1',
  'w01', 'w02', 'w03', 'w04', 'w05', 'w06', 'w08', 'w08.1', 'w09', 'w09.1', 'w10', 'w10.1', 'w11', 'w12',
  'as3', 'as3.1', 'as3.2', 'as3.3',
  'cn1', 'cn1.1', 'cn1.2', 'cn1.3', 'cn1.4', 'cn1.5', 'cn1.6', 'cn1.7',
  'cn2', 'cn2.1', 'cn2.2', 'cn2.3', 'cn2.3.1', 'cn2.4',
  'cn3', 'cn3.1', 'cn3.2', 'cn3.3', 'cn3.4',
  'cn4', 'cn4.1', 'cn4.1.1', 'cn4.2', 'cn4.3',
  'cn5', 'cn5.1', 'cn5.2', 'cn5.3', 'cn5.4', 'cn5.5', 'cn5.6',
  'wr.charging', 'wr.phoneConnected', 'wr.bluetoothConnected', 'wr.dnd',
]

describe('default expression token catalog', () => {
  it('uses tm2 as the only numeric Gregorian month token', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('dt2')).toBeUndefined()
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('tm2')).toMatchObject({
      id: 'time.month',
      valueType: 'number',
      description: 'Current Gregorian month as an integer from 1 to 12.',
      descriptionCn: '当前公历月份整数，取值范围 1–12。',
      exampleExpression: '(tm2) == 8',
      exampleExpressions: [
        { expression: '(tm2)', description: '1–12', descriptionCn: '1–12' },
        { expression: '(tm2).format("%02d")', description: '01–12', descriptionCn: '01–12' },
        { expression: '(tm2) == 8', description: 'Whether the current month is August', descriptionCn: '当前是否为八月' },
        { expression: '(tm2) >= 6 && (tm2) <= 8', description: 'Whether the current month is June through August', descriptionCn: '当前是否为六月到八月' },
      ],
    })
  })

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
      expect(definition.category).toMatch(/^(date-time|activity|sensor|system|weather|astronomy|status)$/)
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
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('cn2.3.1')?.valueType).toBe('number')
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('cn4.1.1')?.valueType).toBe('number')
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('cn2.5')).toBeUndefined()
  })

  it('exposes all 24 next-solar-term numeric enum values', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('cn2.3.1')).toMatchObject({
      id: 'chinaCalendar.solarTerm.nextIndex', labelCn: '下一个节气编号', exampleValue: 13,
      enumValues: [
        { value: 0, label: 'Beginning of Spring', labelCn: '立春' },
        { value: 1, label: 'Rain Water', labelCn: '雨水' },
        { value: 2, label: 'Awakening of Insects', labelCn: '惊蛰' },
        { value: 3, label: 'Spring Equinox', labelCn: '春分' },
        { value: 4, label: 'Clear and Bright', labelCn: '清明' },
        { value: 5, label: 'Grain Rain', labelCn: '谷雨' },
        { value: 6, label: 'Beginning of Summer', labelCn: '立夏' },
        { value: 7, label: 'Lesser Fullness of Grain', labelCn: '小满' },
        { value: 8, label: 'Grain in Ear', labelCn: '芒种' },
        { value: 9, label: 'Summer Solstice', labelCn: '夏至' },
        { value: 10, label: 'Lesser Heat', labelCn: '小暑' },
        { value: 11, label: 'Greater Heat', labelCn: '大暑' },
        { value: 12, label: 'Beginning of Autumn', labelCn: '立秋' },
        { value: 13, label: 'End of Heat', labelCn: '处暑' },
        { value: 14, label: 'White Dew', labelCn: '白露' },
        { value: 15, label: 'Autumn Equinox', labelCn: '秋分' },
        { value: 16, label: 'Cold Dew', labelCn: '寒露' },
        { value: 17, label: "Frost's Descent", labelCn: '霜降' },
        { value: 18, label: 'Beginning of Winter', labelCn: '立冬' },
        { value: 19, label: 'Lesser Snow', labelCn: '小雪' },
        { value: 20, label: 'Greater Snow', labelCn: '大雪' },
        { value: 21, label: 'Winter Solstice', labelCn: '冬至' },
        { value: 22, label: 'Lesser Cold', labelCn: '小寒' },
        { value: 23, label: 'Greater Cold', labelCn: '大寒' },
      ],
    })
  })

  it('exposes all 12 zodiac-year numeric enum values', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('cn4.1.1')).toMatchObject({
      id: 'chinaCalendar.zodiac.yearIndex', labelCn: '生肖编号', exampleValue: 6,
      enumValues: [
        { value: 0, label: 'Rat', labelCn: '鼠' }, { value: 1, label: 'Ox', labelCn: '牛' },
        { value: 2, label: 'Tiger', labelCn: '虎' }, { value: 3, label: 'Rabbit', labelCn: '兔' },
        { value: 4, label: 'Dragon', labelCn: '龙' }, { value: 5, label: 'Snake', labelCn: '蛇' },
        { value: 6, label: 'Horse', labelCn: '马' }, { value: 7, label: 'Goat', labelCn: '羊' },
        { value: 8, label: 'Monkey', labelCn: '猴' }, { value: 9, label: 'Rooster', labelCn: '鸡' },
        { value: 10, label: 'Dog', labelCn: '狗' }, { value: 11, label: 'Pig', labelCn: '猪' },
      ],
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

  it('keeps ds3 raw and exposes ds3.1 as four documented battery stages', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('ds3')).toMatchObject({
      id: 'system.battery.level', unit: '%', enumValues: undefined,
    })
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('ds3.1')).toMatchObject({
      id: 'system.battery.stage', label: 'Battery Stage', labelCn: '电池电量阶段', exampleValue: 3,
      description: 'Battery stage: 0 below 25%; 1 from 25% to below 50%; 2 from 50% to below 75%; 3 at or above 75%.',
      descriptionCn: '电池电量阶段：原值低于 25% 返回 0；25%（含）至 50%（不含）返回 1；50%（含）至 75%（不含）返回 2；75% 及以上返回 3。',
      enumValues: [
        { value: 0, label: 'Low (below 25%)', labelCn: '电量不足（原值 < 25%）' },
        { value: 1, label: 'Fair (25% to below 50%)', labelCn: '电量一般（原值 >= 25% 且 < 50%）' },
        { value: 2, label: 'Good (50% to below 75%)', labelCn: '电量良好（原值 >= 50% 且 < 75%）' },
        { value: 3, label: 'Full (75% or above)', labelCn: '电量充足（原值 >= 75%）' },
      ],
    })
  })

  it('exposes Garmin remaining battery life as integer seconds', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('ds3.3')).toMatchObject({
      id: 'system.battery.remainingSeconds',
      valueType: 'number',
      nullable: true,
      unit: 's',
      exampleValue: 725760,
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

  it('documents integer ranges and equality examples for hour and minute tokens', () => {
    const expected = {
      tm6: ['Integer hour in 24-hour format, from 0 to 23.', '24 小时制小时整数，取值范围 0–23。', '(tm6) == 14'],
      'tm6.0': ['Integer first digit of the 24-hour value, from 1 to 2; null before 10:00.', '24 小时制小时十位整数，取值范围 1–2；小于 10 点时返回空值。', '(tm6.0) == 1'],
      'tm6.1': ['Integer first digit of the zero-padded 24-hour value, from 0 to 2.', '补零后的 24 小时制小时十位整数，取值范围 0–2。', '(tm6.1) == 1'],
      'tm6.2': ['Integer second digit of the 24-hour value, from 0 to 9.', '24 小时制小时个位整数，取值范围 0–9。', '(tm6.2) == 4'],
      'tm7.3': ['Integer hour in 12-hour format, from 1 to 12.', '12 小时制小时整数，取值范围 1–12。', '(tm7.3) == 2'],
      'tm7.4': ['Integer hour in the device format: 0 to 23 in 24-hour mode, or 1 to 12 in 12-hour mode.', '设备时间格式的小时整数：24 小时制取值范围 0–23，12 小时制取值范围 1–12。', '(tm7.4) == 14'],
      'tm7.0': ['Integer first digit of the 12-hour value, always 1 when present; null for single-digit hours.', '12 小时制小时十位整数；有值时固定为 1，个位数小时返回空值。', 'isnull((tm7.0))'],
      'tm7.1': ['Integer first digit of the zero-padded 12-hour value, from 0 to 1.', '补零后的 12 小时制小时十位整数，取值范围 0–1。', '(tm7.1) == 0'],
      'tm7.2': ['Integer second digit of the 12-hour value, from 0 to 9.', '12 小时制小时个位整数，取值范围 0–9。', '(tm7.2) == 2'],
      tm8: ['Integer minute, from 0 to 59.', '分钟整数，取值范围 0–59。', '(tm8) == 30'],
      'tm8.0': ['Integer first minute digit, from 1 to 5; null before minute 10.', '分钟十位整数，取值范围 1–5；分钟数小于 10 时返回空值。', '(tm8.0) == 3'],
      'tm8.1': ['Integer first digit of the zero-padded minute, from 0 to 5.', '补零后的分钟十位整数，取值范围 0–5。', '(tm8.1) == 3'],
      'tm8.2': ['Integer second minute digit, from 0 to 9.', '分钟个位整数，取值范围 0–9。', '(tm8.2) == 0'],
    } as const

    for (const [code, [description, descriptionCn, exampleExpression]] of Object.entries(expected)) {
      expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(code)).toMatchObject({
        description,
        descriptionCn,
        exampleExpression,
      })
    }
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

  it('documents the three AM PM and 24-hour states for tm10.1', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('tm10.1')).toMatchObject({
      id: 'time.amPm24Hour',
      label: 'AM/PM/24H',
      labelCn: '上午/下午/24小时制',
      exampleValue: 2,
      enumValues: [
        { value: 0, label: 'AM', labelCn: '上午' },
        { value: 1, label: 'PM', labelCn: '下午' },
        { value: 2, label: '24H', labelCn: '24小时制' },
      ],
    })
  })

  it('exposes moon age as the numeric as3 token', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('as3')).toMatchObject({
      id: 'astronomy.moonAge',
      label: 'Moon Age',
      labelCn: '月龄',
      valueType: 'number',
      nullable: false,
      exampleValue: 14,
      updateFrequency: 'minute',
      enumValues: [
        ...Array.from({ length: 6 }, (_, index) => ({ value: index + 1, label: `Waxing Crescent ${index + 1}`, labelCn: `渐盈月 ${index + 1}` })),
        { value: 7, label: 'First Quarter', labelCn: '上弦月' },
        ...Array.from({ length: 6 }, (_, index) => ({ value: index + 8, label: `Waxing Gibbous ${index + 1}`, labelCn: `盈凸月 ${index + 1}` })),
        { value: 14, label: 'Full Moon', labelCn: '满月' },
        ...Array.from({ length: 6 }, (_, index) => ({ value: index + 15, label: `Waning Gibbous ${index + 1}`, labelCn: `亏凸月 ${index + 1}` })),
        { value: 21, label: 'Third Quarter', labelCn: '下弦月' },
        ...Array.from({ length: 6 }, (_, index) => ({ value: index + 22, label: `Waning Crescent ${index + 1}`, labelCn: `残月 ${index + 1}` })),
        { value: 28, label: 'New Moon', labelCn: '新月' },
        { value: 29, label: 'New Moon', labelCn: '新月' },
      ],
    })
  })

  it('exposes as3.1 as the confirmed eight-stage moon phase enum', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('as3.1')).toMatchObject({
      id: 'astronomy.moonPhase',
      label: 'Moon Phase',
      labelCn: '月相阶段',
      valueType: 'number',
      nullable: false,
      exampleValue: 4,
      enumValues: [
        { value: 0, label: 'New Moon', labelCn: '新月' },
        { value: 1, label: 'Waxing Crescent', labelCn: '渐盈月' },
        { value: 2, label: 'First Quarter', labelCn: '上弦月' },
        { value: 3, label: 'Waxing Gibbous', labelCn: '盈凸月' },
        { value: 4, label: 'Full Moon', labelCn: '满月' },
        { value: 5, label: 'Waning Gibbous', labelCn: '亏凸月' },
        { value: 6, label: 'Third Quarter', labelCn: '下弦月' },
        { value: 7, label: 'Waning Crescent', labelCn: '残月' },
      ],
    })
  })

  it('exposes true solar time and both confirmed solar period enums', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('as1')).toMatchObject({
      id: 'astronomy.trueSolarSeconds',
      label: 'True Solar Time',
      labelCn: '真太阳时',
      valueType: 'number',
      nullable: true,
      exampleValue: 52200,
    })
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('as1.1')).toMatchObject({
      id: 'astronomy.trueSolarPeriod',
      exampleValue: 3,
      enumValues: [
        { value: 0, label: 'Late Night', labelCn: '深夜' },
        { value: 1, label: 'Early Morning', labelCn: '清晨' },
        { value: 2, label: 'Morning', labelCn: '上午' },
        { value: 3, label: 'Afternoon', labelCn: '下午' },
        { value: 4, label: 'Evening', labelCn: '傍晚' },
        { value: 5, label: 'Night', labelCn: '夜晚' },
      ],
    })
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('as1.2')).toMatchObject({
      id: 'astronomy.astronomicalLightPeriod',
      exampleValue: 4,
      enumValues: [
        { value: 0, label: 'Astronomical Night', labelCn: '天文夜' },
        { value: 1, label: 'Astronomical Dawn', labelCn: '天文晨光' },
        { value: 2, label: 'Nautical Dawn', labelCn: '航海晨光' },
        { value: 3, label: 'Civil Dawn', labelCn: '民用晨光' },
        { value: 4, label: 'Daylight', labelCn: '白昼' },
        { value: 5, label: 'Civil Dusk', labelCn: '民用暮光' },
        { value: 6, label: 'Nautical Dusk', labelCn: '航海暮光' },
        { value: 7, label: 'Astronomical Dusk', labelCn: '天文暮光' },
      ],
    })
  })

  it('exposes the eight solar-event tokens with expression-ready numeric contracts', () => {
    expect([
      ['as2', 'astronomy.sunriseSeconds'],
      ['as2.1', 'astronomy.sunsetSeconds'],
      ['as2.2', 'astronomy.nextSolarEvent'],
      ['as2.3', 'astronomy.secondsUntilNextSolarEvent'],
      ['as2.4', 'astronomy.daylightDuration'],
      ['as2.5', 'astronomy.daylightProgress'],
      ['as2.6', 'astronomy.solarAltitude'],
      ['as2.7', 'astronomy.solarAzimuth'],
    ].map(([code]) => DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(code)?.id)).toEqual([
      'astronomy.sunriseSeconds', 'astronomy.sunsetSeconds', 'astronomy.nextSolarEvent',
      'astronomy.secondsUntilNextSolarEvent', 'astronomy.daylightDuration',
      'astronomy.daylightProgress', 'astronomy.solarAltitude', 'astronomy.solarAzimuth',
    ])
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('as2.2')?.enumValues).toEqual([
      { value: 0, label: 'Sunrise', labelCn: '日出' },
      { value: 1, label: 'Sunset', labelCn: '日落' },
    ])
    expect(['as2', 'as2.1', 'as2.2', 'as2.3', 'as2.4', 'as2.5', 'as2.6', 'as2.7']
      .map((code) => DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(code)?.nullable))
      .toEqual([true, true, true, true, true, true, true, true])
  })

  it('exposes moon illumination and days until the next full moon', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('as3.2')).toMatchObject({
      id: 'astronomy.moonIllumination', valueType: 'number', nullable: false, unit: '%',
    })
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('as3.3')).toMatchObject({
      id: 'astronomy.daysUntilFullMoon', valueType: 'number', nullable: false, unit: 'days',
    })
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

  it('keeps ds330 raw and exposes ds330.1 as four documented body-battery stages', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('ds330')).toMatchObject({
      id: 'sensor.bodyBattery',
      unit: '%',
      enumValues: undefined,
    })
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('ds330.1')).toMatchObject({
      id: 'sensor.bodyBatteryStage',
      label: 'Body Battery Stage',
      labelCn: '身体电量阶段',
      exampleValue: 2,
      description: 'Body Battery stage: 0 below 25; 1 from 25 to below 50; 2 from 50 to below 75; 3 at or above 75.',
      descriptionCn: '身体电量阶段：原值低于 25 返回 0；25（含）至 50（不含）返回 1；50（含）至 75（不含）返回 2；75 及以上返回 3。',
      enumValues: [
        { value: 0, label: 'Exhausted (below 25)', labelCn: '疲惫（原值 < 25）' },
        { value: 1, label: 'Fair (25 to below 50)', labelCn: '一般（原值 >= 25 且 < 50）' },
        { value: 2, label: 'Good (50 to below 75)', labelCn: '良好（原值 >= 50 且 < 75）' },
        { value: 3, label: 'High (75 or above)', labelCn: '充沛（原值 >= 75）' },
      ],
    })
  })

  it('keeps ds331 raw and exposes ds331.1 as four documented stress stages', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('ds331')).toMatchObject({
      id: 'sensor.stress',
      enumValues: undefined,
    })
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('ds331.1')).toMatchObject({
      id: 'sensor.stressStage',
      label: 'Stress Stage',
      labelCn: '压力阶段',
      exampleValue: 1,
      description: 'Stress stage: 0 below 25; 1 from 25 to below 50; 2 from 50 to below 75; 3 at or above 75.',
      descriptionCn: '压力阶段：原值低于 25 返回 0；25（含）至 50（不含）返回 1；50（含）至 75（不含）返回 2；75 及以上返回 3。',
      enumValues: [
        { value: 0, label: 'Relaxed (below 25)', labelCn: '放松（原值 < 25）' },
        { value: 1, label: 'Normal (25 to below 50)', labelCn: '正常（原值 >= 25 且 < 50）' },
        { value: 2, label: 'Tense (50 to below 75)', labelCn: '紧张（原值 >= 50 且 < 75）' },
        { value: 3, label: 'High stress (75 or above)', labelCn: '高压（原值 >= 75）' },
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

  it('keeps w09 raw and exposes w09.1 as three documented humidity stages', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('w09')).toMatchObject({
      id: 'weather.current.humidity',
      unit: '%',
      enumValues: undefined,
    })
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('w09.1')).toMatchObject({
      id: 'weather.current.humidityLevel',
      label: 'Humidity Level',
      labelCn: '湿度阶段',
      nullable: true,
      enumValues: [
        { value: 0, label: 'Dry (below 40%)', labelCn: '干燥（原值 < 40%）' },
        { value: 1, label: 'Comfortable (40% to 60%)', labelCn: '舒适（原值 40% 至 60%）' },
        { value: 2, label: 'Humid (above 60%)', labelCn: '潮湿（原值 > 60%）' },
      ],
    })
  })

  it('keeps w08 raw and exposes w08.1 as three documented precipitation stages', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('w08')).toMatchObject({
      id: 'weather.current.precipitationChance', unit: '%', enumValues: undefined,
    })
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('w08.1')).toMatchObject({
      id: 'weather.current.precipitationLevel', label: 'Precipitation Level', labelCn: '降水概率阶段',
      exampleValue: 1,
      description: 'Precipitation stage: 0 below 30%; 1 from 30% to below 70%; 2 at or above 70%.',
      descriptionCn: '降水概率阶段：原值低于 30% 返回 0；30%（含）至 70%（不含）返回 1；70% 及以上返回 2。',
      enumValues: [
        { value: 0, label: 'No rain (below 30%)', labelCn: '无雨（原值 < 30%）' },
        { value: 1, label: 'Rain possible (30% to below 70%)', labelCn: '可能下雨（原值 >= 30% 且 < 70%）' },
        { value: 2, label: 'Rain likely (70% or above)', labelCn: '大概率下雨（原值 >= 70%）' },
      ],
    })
  })

  it('keeps w10 raw and exposes w10.1 as four documented Celsius temperature stages', () => {
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('w10')).toMatchObject({
      id: 'weather.current.temperature',
      unit: '°C',
      enumValues: undefined,
    })
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('w10.1')).toMatchObject({
      id: 'weather.current.temperatureLevel',
      label: 'Temperature Level',
      labelCn: '温度阶段',
      nullable: true,
      enumValues: [
        { value: 0, label: 'Cold (below 10°C)', labelCn: '寒冷（原值 < 10°C）' },
        { value: 1, label: 'Cool (10°C to below 18°C)', labelCn: '凉爽（原值 >= 10°C 且 < 18°C）' },
        { value: 2, label: 'Comfortable (18°C to 25°C)', labelCn: '舒适（原值 18°C 至 25°C）' },
        { value: 3, label: 'Hot (above 25°C)', labelCn: '炎热（原值 > 25°C）' },
      ],
    })
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
