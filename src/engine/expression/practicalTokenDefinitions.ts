import type { ExpressionTokenCategory, ExpressionTokenDefinition, ExpressionValueType } from './types'

type ScalarType = Extract<ExpressionValueType, 'number' | 'string' | 'boolean'>
type TokenInput = {
  id: string
  code: string
  label: string
  labelCn: string
  category: ExpressionTokenCategory
  valueType?: ScalarType
  nullable?: boolean
  unit?: string
  exampleValue: unknown
  enumValues?: ExpressionTokenDefinition['enumValues']
  source: ExpressionTokenDefinition['source']
  updateFrequency?: ExpressionTokenDefinition['updateFrequency']
  providerKey: string
  requirement?: string
  description?: string
  descriptionCn?: string
  exampleExpression?: string
  exampleExpressions?: ExpressionTokenDefinition['exampleExpressions']
  wfbEquivalent?: string
  appLanguages?: ExpressionTokenDefinition['appLanguages']
}

const token = (input: TokenInput): ExpressionTokenDefinition => ({
  id: input.id,
  code: input.code,
  label: input.label,
  labelCn: input.labelCn,
  description: input.description || input.label,
  descriptionCn: input.descriptionCn || input.labelCn,
  category: input.category,
  valueType: input.valueType || 'number',
  nullable: input.nullable ?? false,
  unit: input.unit,
  exampleValue: input.exampleValue,
  enumValues: input.enumValues,
  source: input.source,
  supportedTargets: ['visibility'],
  updateFrequency: input.updateFrequency || 'minute',
  providerKey: input.providerKey,
  deviceRequirements: [input.requirement || 'All supported Connect IQ devices'],
  exampleExpression: input.exampleExpression || `(${input.code})`,
  exampleExpressions: input.exampleExpressions,
  wfbEquivalent: input.wfbEquivalent === undefined && !input.code.startsWith('wr.') ? input.code : input.wfbEquivalent,
  appLanguages: input.appLanguages,
})

const time = (id: string, code: string, label: string, labelCn: string, exampleValue: number) => token({
  id: `time.${id}`, code, label, labelCn, category: 'date-time', exampleValue, source: 'time',
  updateFrequency: code === 'tm9' ? 'second' : 'minute', providerKey: 'clock',
})

const activity = (id: string, code: string, label: string, labelCn: string, exampleValue: number, unit?: string) => token({
  id: `activity.${id}`, code, label, labelCn, category: 'activity', exampleValue, unit, source: 'activity',
  providerKey: 'activityInfo', nullable: true, requirement: 'Activity Monitor support and available activity data',
})

const sensor = (id: string, code: string, label: string, labelCn: string, exampleValue: number, unit?: string) => token({
  id: `sensor.${id}`, code, label, labelCn, category: 'sensor', exampleValue, unit, source: 'sensor',
  providerKey: `sensorHistory.${id}`, nullable: true, requirement: `Sensor history support for ${label}`,
})

const weather = (id: string, code: string, label: string, labelCn: string, exampleValue: unknown, valueType: ScalarType = 'number', unit?: string) => token({
  id: `weather.current.${id}`, code, label, labelCn, category: 'weather', exampleValue, valueType, unit,
  description: `Current Garmin weather: ${label}`,
  descriptionCn: `当前天气（Garmin）：${labelCn}`,
  source: 'weather', updateFrequency: 'network', providerKey: 'currentWeather', nullable: true,
  requirement: 'Toybox.Weather current conditions and synced weather data',
})

const astronomy = (input: Omit<TokenInput, 'category' | 'source' | 'providerKey'>): ExpressionTokenDefinition => token({
  ...input,
  category: 'astronomy',
  source: 'time',
  providerKey: 'clock',
})

const chineseCalendar = (
  id: string,
  code: string,
  label: string,
  labelCn: string,
  exampleValue: unknown,
  valueType: ScalarType = 'string',
  nullable = false,
) => token({
  id: `chinaCalendar.${id}`, code, label, labelCn, category: 'date-time', valueType, nullable,
  exampleValue, source: 'wristo', providerKey: 'chineseCalendar', appLanguages: ['zhs'], wfbEquivalent: undefined,
})

const WRISTO_WEATHER_CODE_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 0, label: 'Clear', labelCn: '晴天' },
  { value: 1, label: 'Few Clouds', labelCn: '少云' },
  { value: 2, label: 'Light Rain', labelCn: '小雨' },
  { value: 3, label: 'Clear Night', labelCn: '晴朗夜间' },
  { value: 4, label: 'Few Clouds Night', labelCn: '少云夜间' },
  { value: 5, label: 'Light Rain Night', labelCn: '小雨夜间' },
  { value: 6, label: 'Thunderstorm', labelCn: '雷暴' },
  { value: 7, label: 'Drizzle', labelCn: '细雨' },
  { value: 8, label: 'Freezing Rain', labelCn: '冰雨' },
  { value: 9, label: 'Heavy Rain', labelCn: '大雨' },
  { value: 10, label: 'Snow', labelCn: '雪' },
  { value: 11, label: 'Mist', labelCn: '雾或霾' },
  { value: 12, label: 'Scattered Clouds', labelCn: '散云' },
  { value: 13, label: 'Broken Clouds', labelCn: '破云' },
]

const DAY_OF_WEEK_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 1, label: 'Sunday', labelCn: '周日' },
  { value: 2, label: 'Monday', labelCn: '周一' },
  { value: 3, label: 'Tuesday', labelCn: '周二' },
  { value: 4, label: 'Wednesday', labelCn: '周三' },
  { value: 5, label: 'Thursday', labelCn: '周四' },
  { value: 6, label: 'Friday', labelCn: '周五' },
  { value: 7, label: 'Saturday', labelCn: '周六' },
]

const MOVE_BAR_LEVEL_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 0, label: 'No alert (under 60 min)', labelCn: '无久坐提醒（不足 60 分钟）' },
  { value: 1, label: 'First bar (60–74 min)', labelCn: '一级久坐提醒（60–74 分钟）' },
  { value: 2, label: 'Two bars (75–89 min)', labelCn: '二级久坐提醒（75–89 分钟）' },
  { value: 3, label: 'Three bars (90–104 min)', labelCn: '三级久坐提醒（90–104 分钟）' },
  { value: 4, label: 'Four bars (105–119 min)', labelCn: '四级久坐提醒（105–119 分钟）' },
  { value: 5, label: 'Full move bar (120+ min)', labelCn: '完整久坐提醒（120 分钟及以上）' },
]

const HEART_RATE_ZONE_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 0, label: 'No valid zone or below Zone 1', labelCn: '无有效区间或低于 Z1 下限' },
  { value: 1, label: 'Zone 1: Z1 threshold to below Z2', labelCn: 'Z1：达到 Z1 下限且低于 Z2 下限' },
  { value: 2, label: 'Zone 2: Z2 threshold to below Z3', labelCn: 'Z2：达到 Z2 下限且低于 Z3 下限' },
  { value: 3, label: 'Zone 3: Z3 threshold to below Z4', labelCn: 'Z3：达到 Z3 下限且低于 Z4 下限' },
  { value: 4, label: 'Zone 4: Z4 threshold to below Z5', labelCn: 'Z4：达到 Z4 下限且低于 Z5 下限' },
  { value: 5, label: 'Zone 5: at or above the Z5 threshold', labelCn: 'Z5：达到或超过 Z5 下限' },
]

const BATTERY_STAGE_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 0, label: 'Low (below 25%)', labelCn: '电量不足（原值 < 25%）' },
  { value: 1, label: 'Fair (25% to below 50%)', labelCn: '电量一般（原值 >= 25% 且 < 50%）' },
  { value: 2, label: 'Good (50% to below 75%)', labelCn: '电量良好（原值 >= 50% 且 < 75%）' },
  { value: 3, label: 'Full (75% or above)', labelCn: '电量充足（原值 >= 75%）' },
]

const BODY_BATTERY_STAGE_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 0, label: 'Exhausted (below 25)', labelCn: '疲惫（原值 < 25）' },
  { value: 1, label: 'Fair (25 to below 50)', labelCn: '一般（原值 >= 25 且 < 50）' },
  { value: 2, label: 'Good (50 to below 75)', labelCn: '良好（原值 >= 50 且 < 75）' },
  { value: 3, label: 'High (75 or above)', labelCn: '充沛（原值 >= 75）' },
]

const STRESS_STAGE_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 0, label: 'Relaxed (below 25)', labelCn: '放松（原值 < 25）' },
  { value: 1, label: 'Normal (25 to below 50)', labelCn: '正常（原值 >= 25 且 < 50）' },
  { value: 2, label: 'Tense (50 to below 75)', labelCn: '紧张（原值 >= 50 且 < 75）' },
  { value: 3, label: 'High stress (75 or above)', labelCn: '高压（原值 >= 75）' },
]

const HUMIDITY_LEVEL_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 0, label: 'Dry (below 40%)', labelCn: '干燥（原值 < 40%）' },
  { value: 1, label: 'Comfortable (40% to 60%)', labelCn: '舒适（原值 40% 至 60%）' },
  { value: 2, label: 'Humid (above 60%)', labelCn: '潮湿（原值 > 60%）' },
]

const PRECIPITATION_LEVEL_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 0, label: 'No rain (below 30%)', labelCn: '无雨（原值 < 30%）' },
  { value: 1, label: 'Rain possible (30% to below 70%)', labelCn: '可能下雨（原值 >= 30% 且 < 70%）' },
  { value: 2, label: 'Rain likely (70% or above)', labelCn: '大概率下雨（原值 >= 70%）' },
]

const SOLAR_TERM_INDEX_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
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
]

const ZODIAC_INDEX_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 0, label: 'Rat', labelCn: '鼠' }, { value: 1, label: 'Ox', labelCn: '牛' },
  { value: 2, label: 'Tiger', labelCn: '虎' }, { value: 3, label: 'Rabbit', labelCn: '兔' },
  { value: 4, label: 'Dragon', labelCn: '龙' }, { value: 5, label: 'Snake', labelCn: '蛇' },
  { value: 6, label: 'Horse', labelCn: '马' }, { value: 7, label: 'Goat', labelCn: '羊' },
  { value: 8, label: 'Monkey', labelCn: '猴' }, { value: 9, label: 'Rooster', labelCn: '鸡' },
  { value: 10, label: 'Dog', labelCn: '狗' }, { value: 11, label: 'Pig', labelCn: '猪' },
]

const TEMPERATURE_LEVEL_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 0, label: 'Cold (below 10°C)', labelCn: '寒冷（原值 < 10°C）' },
  { value: 1, label: 'Cool (10°C to below 18°C)', labelCn: '凉爽（原值 >= 10°C 且 < 18°C）' },
  { value: 2, label: 'Comfortable (18°C to 25°C)', labelCn: '舒适（原值 18°C 至 25°C）' },
  { value: 3, label: 'Hot (above 25°C)', labelCn: '炎热（原值 > 25°C）' },
]

const TRUE_SOLAR_PERIOD_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 0, label: 'Late Night', labelCn: '深夜' },
  { value: 1, label: 'Early Morning', labelCn: '清晨' },
  { value: 2, label: 'Morning', labelCn: '上午' },
  { value: 3, label: 'Afternoon', labelCn: '下午' },
  { value: 4, label: 'Evening', labelCn: '傍晚' },
  { value: 5, label: 'Night', labelCn: '夜晚' },
]

const ASTRONOMICAL_LIGHT_PERIOD_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 0, label: 'Astronomical Night', labelCn: '天文夜' },
  { value: 1, label: 'Astronomical Dawn', labelCn: '天文晨光' },
  { value: 2, label: 'Nautical Dawn', labelCn: '航海晨光' },
  { value: 3, label: 'Civil Dawn', labelCn: '民用晨光' },
  { value: 4, label: 'Daylight', labelCn: '白昼' },
  { value: 5, label: 'Civil Dusk', labelCn: '民用暮光' },
  { value: 6, label: 'Nautical Dusk', labelCn: '航海暮光' },
  { value: 7, label: 'Astronomical Dusk', labelCn: '天文暮光' },
]

const MOON_AGE_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  ...Array.from({ length: 6 }, (_, index) => ({ value: index + 1, label: `Waxing Crescent ${index + 1}`, labelCn: `渐盈月 ${index + 1}` })),
  { value: 7, label: 'First Quarter', labelCn: '上弦月' },
  ...Array.from({ length: 6 }, (_, index) => ({ value: index + 8, label: `Waxing Gibbous ${index + 1}`, labelCn: `盈凸月 ${index + 1}` })),
  { value: 14, label: 'Full Moon', labelCn: '满月' },
  ...Array.from({ length: 6 }, (_, index) => ({ value: index + 15, label: `Waning Gibbous ${index + 1}`, labelCn: `亏凸月 ${index + 1}` })),
  { value: 21, label: 'Third Quarter', labelCn: '下弦月' },
  ...Array.from({ length: 6 }, (_, index) => ({ value: index + 22, label: `Waning Crescent ${index + 1}`, labelCn: `残月 ${index + 1}` })),
  { value: 28, label: 'New Moon', labelCn: '新月' },
  { value: 29, label: 'New Moon', labelCn: '新月' },
]

const MOON_PHASE_VALUES: NonNullable<ExpressionTokenDefinition['enumValues']> = [
  { value: 0, label: 'New Moon', labelCn: '新月' },
  { value: 1, label: 'Waxing Crescent', labelCn: '渐盈月' },
  { value: 2, label: 'First Quarter', labelCn: '上弦月' },
  { value: 3, label: 'Waxing Gibbous', labelCn: '盈凸月' },
  { value: 4, label: 'Full Moon', labelCn: '满月' },
  { value: 5, label: 'Waning Gibbous', labelCn: '亏凸月' },
  { value: 6, label: 'Third Quarter', labelCn: '下弦月' },
  { value: 7, label: 'Waning Crescent', labelCn: '残月' },
]

export const PRACTICAL_EXPRESSION_TOKEN_DEFINITIONS: readonly ExpressionTokenDefinition[] = [
  token({ id: 'date.year', code: 'dt1', label: 'Year', labelCn: '年份', category: 'date-time', exampleValue: 2026, source: 'time', providerKey: 'clock' }),
  token({ id: 'date.shortYear', code: 'dt1.1', label: 'Short Year', labelCn: '两位年份', category: 'date-time', exampleValue: 26, source: 'time', providerKey: 'clock' }),
  token({ id: 'date.monthShort', code: 'dt2.1', label: 'Month Short', labelCn: '月份简称', category: 'date-time', valueType: 'string', exampleValue: 'Jun', source: 'time', providerKey: 'clock' }),
  token({ id: 'date.monthLong', code: 'dt2.2', label: 'Month Long', labelCn: '月份全称', category: 'date-time', valueType: 'string', exampleValue: 'June', source: 'time', providerKey: 'clock' }),
  token({ id: 'date.dayOfMonth', code: 'dt3', label: 'Day of Month', labelCn: '日期', category: 'date-time', exampleValue: 30, source: 'time', providerKey: 'clock' }),
  token({ id: 'date.isoWeek', code: 'dt4', label: 'ISO Week', labelCn: 'ISO 周数', category: 'date-time', exampleValue: 27, source: 'time', providerKey: 'clock' }),
  token({ id: 'date.dayOfWeek', code: 'dt5', label: 'Day of Week', labelCn: '星期序号', category: 'date-time', exampleValue: 3, source: 'time', providerKey: 'clock' }),
  token({ id: 'date.weekdayShort', code: 'dt5.1', label: 'Weekday Short', labelCn: '星期简称', category: 'date-time', valueType: 'string', exampleValue: 'Tue', source: 'time', providerKey: 'clock' }),
  token({ id: 'date.weekdayLong', code: 'dt5.2', label: 'Weekday Long', labelCn: '星期全称', category: 'date-time', valueType: 'string', exampleValue: 'Tuesday', source: 'time', providerKey: 'clock' }),
  token({ id: 'date.dayOfYear', code: 'dt6', label: 'Day of Year', labelCn: '年内天数', category: 'date-time', exampleValue: 181, source: 'time', providerKey: 'clock' }),
  time('year', 'tm1', 'Year', '年份', 2026),
  time('shortYear', 'tm1.1', 'Short Year', '两位年份', 26),
  token({
    id: 'time.month', code: 'tm2', label: 'Month', labelCn: '月份', category: 'date-time', exampleValue: 8, source: 'time', providerKey: 'clock',
    description: 'Current Gregorian month as an integer from 1 to 12.', descriptionCn: '当前公历月份整数，取值范围 1–12。', exampleExpression: '(tm2) == 8',
    exampleExpressions: [
      { expression: '(tm2)', description: '1–12', descriptionCn: '1–12' },
      { expression: '(tm2).format("%02d")', description: '01–12', descriptionCn: '01–12' },
      { expression: '(tm2) == 8', description: 'Whether the current month is August', descriptionCn: '当前是否为八月' },
      { expression: '(tm2) >= 6 && (tm2) <= 8', description: 'Whether the current month is June through August', descriptionCn: '当前是否为六月到八月' },
    ],
  }),
  time('dayOfMonth', 'tm3', 'Day of Month', '日期', 15),
  time('isoWeek', 'tm4', 'ISO Week', 'ISO 周数', 33),
  token({
    id: 'time.dayOfWeek', code: 'tm5', label: 'Day of Week', labelCn: '星期', category: 'date-time',
    exampleValue: 7, enumValues: DAY_OF_WEEK_VALUES, source: 'time', providerKey: 'clock',
    description: 'Day of week using Connect IQ values: Sunday is 1 through Saturday is 7.',
    descriptionCn: 'Connect IQ 星期枚举值：周日为 1，周一为 2，依次至周六为 7。',
  }),
  token({ id: 'time.hour24', code: 'tm6', label: 'Hour (24-hour)', labelCn: '小时（24 小时制）', category: 'date-time', exampleValue: 14, source: 'time', providerKey: 'clock', description: 'Integer hour in 24-hour format, from 0 to 23.', descriptionCn: '24 小时制小时整数，取值范围 0–23。', exampleExpression: '(tm6) == 14' }),
  token({ id: 'time.hour24FirstDigit', code: 'tm6.1', label: 'First Hour Digit (24-hour)', labelCn: '小时十位（24 小时制）', category: 'date-time', exampleValue: 1, source: 'time', providerKey: 'clock', description: 'Integer first digit of the zero-padded 24-hour value, from 0 to 2.', descriptionCn: '补零后的 24 小时制小时十位整数，取值范围 0–2。', exampleExpression: '(tm6.1) == 1' }),
  token({ id: 'time.hour24FirstDigitNullable', code: 'tm6.0', label: 'Optional First Hour Digit (24-hour)', labelCn: '可空小时十位（24 小时制）', category: 'date-time', exampleValue: 1, source: 'time', providerKey: 'clock', nullable: true, description: 'Integer first digit of the 24-hour value, from 1 to 2; null before 10:00.', descriptionCn: '24 小时制小时十位整数，取值范围 1–2；小于 10 点时返回空值。', exampleExpression: '(tm6.0) == 1' }),
  token({ id: 'time.hour24SecondDigit', code: 'tm6.2', label: 'Second Hour Digit (24-hour)', labelCn: '小时个位（24 小时制）', category: 'date-time', exampleValue: 4, source: 'time', providerKey: 'clock', description: 'Integer second digit of the 24-hour value, from 0 to 9.', descriptionCn: '24 小时制小时个位整数，取值范围 0–9。', exampleExpression: '(tm6.2) == 4' }),
  token({ id: 'time.hour12', code: 'tm7.3', label: 'Hour (12-hour)', labelCn: '小时（12 小时制）', category: 'date-time', exampleValue: 2, source: 'time', providerKey: 'clock', description: 'Integer hour in 12-hour format, from 1 to 12.', descriptionCn: '12 小时制小时整数，取值范围 1–12。', exampleExpression: '(tm7.3) == 2' }),
  token({ id: 'time.deviceHour', code: 'tm7.4', label: 'Hour (Device Format)', labelCn: '小时（设备格式）', category: 'date-time', exampleValue: 14, source: 'time', providerKey: 'clock', description: 'Integer hour in the device format: 0 to 23 in 24-hour mode, or 1 to 12 in 12-hour mode.', descriptionCn: '设备时间格式的小时整数：24 小时制取值范围 0–23，12 小时制取值范围 1–12。', exampleExpression: '(tm7.4) == 14' }),
  token({ id: 'time.hour12FirstDigitNullable', code: 'tm7.0', label: 'Optional First Hour Digit (12-hour)', labelCn: '可空小时十位（12 小时制）', category: 'date-time', exampleValue: null, source: 'time', providerKey: 'clock', nullable: true, description: 'Integer first digit of the 12-hour value, always 1 when present; null for single-digit hours.', descriptionCn: '12 小时制小时十位整数；有值时固定为 1，个位数小时返回空值。', exampleExpression: 'isnull((tm7.0))' }),
  token({ id: 'time.hour12FirstDigit', code: 'tm7.1', label: 'First Hour Digit (12-hour)', labelCn: '小时十位（12 小时制）', category: 'date-time', exampleValue: 0, source: 'time', providerKey: 'clock', description: 'Integer first digit of the zero-padded 12-hour value, from 0 to 1.', descriptionCn: '补零后的 12 小时制小时十位整数，取值范围 0–1。', exampleExpression: '(tm7.1) == 0' }),
  token({ id: 'time.hour12SecondDigit', code: 'tm7.2', label: 'Second Hour Digit (12-hour)', labelCn: '小时个位（12 小时制）', category: 'date-time', exampleValue: 2, source: 'time', providerKey: 'clock', description: 'Integer second digit of the 12-hour value, from 0 to 9.', descriptionCn: '12 小时制小时个位整数，取值范围 0–9。', exampleExpression: '(tm7.2) == 2' }),
  token({ id: 'time.minute', code: 'tm8', label: 'Minute', labelCn: '分钟', category: 'date-time', exampleValue: 30, source: 'time', providerKey: 'clock', description: 'Integer minute, from 0 to 59.', descriptionCn: '分钟整数，取值范围 0–59。', exampleExpression: '(tm8) == 30' }),
  token({ id: 'time.minuteFirstDigitNullable', code: 'tm8.0', label: 'Optional First Minute Digit', labelCn: '可空分钟十位', category: 'date-time', exampleValue: 3, source: 'time', providerKey: 'clock', nullable: true, description: 'Integer first minute digit, from 1 to 5; null before minute 10.', descriptionCn: '分钟十位整数，取值范围 1–5；分钟数小于 10 时返回空值。', exampleExpression: '(tm8.0) == 3' }),
  token({ id: 'time.minuteFirstDigit', code: 'tm8.1', label: 'First Minute Digit', labelCn: '分钟十位', category: 'date-time', exampleValue: 3, source: 'time', providerKey: 'clock', description: 'Integer first digit of the zero-padded minute, from 0 to 5.', descriptionCn: '补零后的分钟十位整数，取值范围 0–5。', exampleExpression: '(tm8.1) == 3' }),
  token({ id: 'time.minuteSecondDigit', code: 'tm8.2', label: 'Second Minute Digit', labelCn: '分钟个位', category: 'date-time', exampleValue: 0, source: 'time', providerKey: 'clock', description: 'Integer second minute digit, from 0 to 9.', descriptionCn: '分钟个位整数，取值范围 0–9。', exampleExpression: '(tm8.2) == 0' }),
  time('second', 'tm9', 'Second', '秒', 45),
  token({ id: 'time.secondFirstDigitNullable', code: 'tm9.0', label: 'Optional First Second Digit', labelCn: '可空秒钟十位', category: 'date-time', exampleValue: 4, source: 'time', providerKey: 'clock', nullable: true, updateFrequency: 'second', description: 'First second digit; null before second 10.', descriptionCn: '秒钟十位；秒数小于 10 时返回空值。' }),
  token({ id: 'time.secondFirstDigit', code: 'tm9.3', label: 'First Second Digit', labelCn: '秒钟十位', category: 'date-time', exampleValue: 4, source: 'time', providerKey: 'clock', updateFrequency: 'second' }),
  token({ id: 'time.secondSecondDigit', code: 'tm9.4', label: 'Second Second Digit', labelCn: '秒钟个位', category: 'date-time', exampleValue: 5, source: 'time', providerKey: 'clock', updateFrequency: 'second' }),
  token({
    id: 'time.amPm', code: 'tm10', label: 'AM/PM', labelCn: '上午/下午',
    category: 'date-time', exampleValue: 1, source: 'time', providerKey: 'clock',
    enumValues: [
      { value: 0, label: 'AM', labelCn: '上午' },
      { value: 1, label: 'PM', labelCn: '下午' },
    ],
    description: 'AM or PM based on the current hour: 0 before 12:00 and 1 from 12:00 onward.',
    descriptionCn: '根据当前小时返回上午或下午：12:00 前为 0，12:00 起为 1。',
  }),
  token({
    id: 'time.amPm24Hour', code: 'tm10.1', label: 'AM/PM/24H', labelCn: '上午/下午/24小时制',
    category: 'date-time', exampleValue: 2, source: 'time', providerKey: 'clock',
    enumValues: [
      { value: 0, label: 'AM', labelCn: '上午' },
      { value: 1, label: 'PM', labelCn: '下午' },
      { value: 2, label: '24H', labelCn: '24小时制' },
    ],
    description: 'Device time state: AM or PM in 12-hour mode, otherwise 24H.',
    descriptionCn: '设备时间制状态：12 小时制返回上午或下午，24 小时制返回 24H。',
  }),
  time('dayOfYear', 'tm11', 'Day of Year', '年内天数', 227),
  astronomy({
    id: 'astronomy.trueSolarSeconds', code: 'as1', label: 'True Solar Time', labelCn: '真太阳时',
    exampleValue: 52200, nullable: true,
    requirement: 'A synced position with longitude',
    description: 'True solar time as seconds since local solar midnight, from 0 through 86399.',
    descriptionCn: '真太阳时距当地太阳午夜的秒数，范围为 0–86399。',
  }),
  astronomy({
    id: 'astronomy.trueSolarPeriod', code: 'as1.1', label: 'True Solar Period', labelCn: '真太阳时段',
    exampleValue: 3, enumValues: TRUE_SOLAR_PERIOD_VALUES,
    nullable: true, requirement: 'A synced position with longitude',
    description: 'Fixed six-period classification derived from true solar time.',
    descriptionCn: '根据真太阳时划分的固定六时段。',
  }),
  astronomy({
    id: 'astronomy.astronomicalLightPeriod', code: 'as1.2', label: 'Astronomical Light Period', labelCn: '天文光照阶段',
    exampleValue: 4, enumValues: ASTRONOMICAL_LIGHT_PERIOD_VALUES,
    nullable: true, requirement: 'A synced position with latitude and longitude',
    description: 'Dynamic daylight and twilight stage derived from current solar altitude and the rising or setting half of the solar day.',
    descriptionCn: '根据当前太阳高度以及太阳处于升起或落下半程动态划分的白昼与曙暮光阶段。',
  }),
  astronomy({
    id: 'astronomy.sunriseSeconds', code: 'as2', label: 'Sunrise Time', labelCn: '日出时间',
    exampleValue: 21600, unit: 's', nullable: true, requirement: 'A synced position',
    description: 'Sunrise as seconds since local midnight, from 0 through 86399.',
    descriptionCn: '日出时刻距当地午夜的秒数，范围为 0–86399。',
  }),
  astronomy({
    id: 'astronomy.sunsetSeconds', code: 'as2.1', label: 'Sunset Time', labelCn: '日落时间',
    exampleValue: 64800, unit: 's', nullable: true, requirement: 'A synced position',
    description: 'Sunset as seconds since local midnight, from 0 through 86399.',
    descriptionCn: '日落时刻距当地午夜的秒数，范围为 0–86399。',
  }),
  astronomy({
    id: 'astronomy.nextSolarEvent', code: 'as2.2', label: 'Next Solar Event', labelCn: '下一太阳事件',
    exampleValue: 1, nullable: true, enumValues: [
      { value: 0, label: 'Sunrise', labelCn: '日出' },
      { value: 1, label: 'Sunset', labelCn: '日落' },
    ], requirement: 'A synced position',
    description: 'Next solar event: 0 for sunrise or 1 for sunset.',
    descriptionCn: '下一太阳事件：0 表示日出，1 表示日落。',
  }),
  astronomy({
    id: 'astronomy.secondsUntilNextSolarEvent', code: 'as2.3', label: 'Seconds Until Next Solar Event', labelCn: '距下一太阳事件秒数',
    exampleValue: 7200, unit: 's', nullable: true, requirement: 'A synced position',
    description: 'Whole seconds remaining until the next sunrise or sunset.',
    descriptionCn: '距离下一次日出或日落剩余的整数秒数。',
  }),
  astronomy({
    id: 'astronomy.daylightDuration', code: 'as2.4', label: 'Daylight Duration', labelCn: '白昼长度',
    exampleValue: 43200, unit: 's', nullable: true, requirement: 'A synced position',
    description: 'Seconds from today’s sunrise through sunset.',
    descriptionCn: '从当日日出到日落的秒数。',
  }),
  astronomy({
    id: 'astronomy.daylightProgress', code: 'as2.5', label: 'Daylight Progress', labelCn: '白昼进度',
    exampleValue: 50, unit: '%', nullable: true, requirement: 'A synced position',
    description: 'Integer daylight progress from 0 through 100; returns 0 outside daylight.',
    descriptionCn: '白昼进度整数百分比，范围为 0–100；非白昼时返回 0。',
  }),
  astronomy({
    id: 'astronomy.solarAltitude', code: 'as2.6', label: 'Solar Altitude', labelCn: '太阳高度角',
    exampleValue: 45, unit: '°', nullable: true, requirement: 'A synced position',
    description: 'Current solar altitude in degrees, from -90 through 90.',
    descriptionCn: '当前太阳高度角，范围为 -90°–90°。',
  }),
  astronomy({
    id: 'astronomy.solarAzimuth', code: 'as2.7', label: 'Solar Azimuth', labelCn: '太阳方位角',
    exampleValue: 180, unit: '°', nullable: true, requirement: 'A synced position',
    description: 'Current solar azimuth clockwise from north, from 0 through 360 degrees.',
    descriptionCn: '当前太阳方位角，以正北为 0° 顺时针计算，范围为 0°–360°。',
  }),

  activity('activeMinutesToday', 'ai1', 'Active Minutes Today', '今日活跃分钟', 42, 'min'),
  activity('moderateMinutesToday', 'ai1.1', 'Moderate Minutes Today', '今日中等强度分钟', 24, 'min'),
  activity('vigorousMinutesToday', 'ai1.2', 'Vigorous Minutes Today', '今日高强度分钟', 9, 'min'),
  activity('caloriesToday', 'ai4', 'Total Calories', '今日总热量', 1680, 'kcal'),
  token({
    id: 'activity.activeCaloriesToday', code: 'ai4.1', label: 'Active Calories (Compatible)', labelCn: '活动热量（兼容值）',
    category: 'activity', exampleValue: 430, unit: 'kcal', source: 'activity', providerKey: 'activityInfo', nullable: true,
    description: 'Uses daily calories because Connect IQ does not expose Garmin’s distinct active-calorie total.',
    descriptionCn: 'Connect IQ 未公开 Garmin 独立的活动热量数值，因此返回今日热量兼容值。',
    requirement: 'Activity Monitor support; value falls back to documented daily calories',
  }),
  activity('distanceToday', 'ai5', 'Distance Today', '今日距离', 645000, 'cm'),
  activity('floorsClimbedToday', 'ai6', 'Floors Climbed', '今日爬楼层数', 7),
  activity('floorsDescendedToday', 'ai8', 'Floors Descended', '今日下楼层数', 6),
  token({
    id: 'activity.moveBarLevel', code: 'ai11', label: 'Move Bar', labelCn: '久坐提醒等级',
    category: 'activity', exampleValue: 2, enumValues: MOVE_BAR_LEVEL_VALUES, source: 'activity',
    providerKey: 'activityInfo', nullable: true, requirement: 'Activity Monitor support and available move-bar data',
    description: 'Garmin move-bar alert level: 0 before 60 inactive minutes; level 1 at 60 minutes; then one additional level every 15 minutes until level 5 at 120 minutes.',
    descriptionCn: 'Garmin 久坐提醒等级：静止不足 60 分钟返回 0；60 分钟进入 1 级；之后每 15 分钟增加一级，120 分钟及以上为 5 级。',
  }),
  activity('stepsToday', 'ai12', 'Steps', '今日步数', 8240, 'steps'),
  activity('stepsGoal', 'ai13', 'Steps Goal', '步数目标', 10000, 'steps'),
  activity('respirationRate', 'ai14', 'Respiration Rate', '呼吸频率', 15, 'brpm'),

  token({ id: 'system.alarm.count', code: 'ds1', label: 'Alarm Count', labelCn: '闹钟数量', category: 'system', exampleValue: 1, source: 'system', providerKey: 'deviceSettings', nullable: true, requirement: 'Alarm access support' }),
  token({ id: 'system.notification.count', code: 'ds2', label: 'Notification Count', labelCn: '通知数量', category: 'system', exampleValue: 3, source: 'system', providerKey: 'deviceSettings', nullable: true, requirement: 'Notification count support' }),
  token({ id: 'system.battery.level', code: 'ds3', label: 'Battery Level', labelCn: '电池电量', category: 'system', exampleValue: 76, unit: '%', source: 'system', providerKey: 'systemStats' }),
  token({
    id: 'system.battery.stage', code: 'ds3.1', label: 'Battery Stage', labelCn: '电池电量阶段',
    category: 'system', exampleValue: 3, enumValues: BATTERY_STAGE_VALUES, source: 'system', providerKey: 'systemStats',
    description: 'Battery stage: 0 below 25%; 1 from 25% to below 50%; 2 from 50% to below 75%; 3 at or above 75%.',
    descriptionCn: '电池电量阶段：原值低于 25% 返回 0；25%（含）至 50%（不含）返回 1；50%（含）至 75%（不含）返回 2；75% 及以上返回 3。',
  }),
  token({
    id: 'system.battery.remainingSeconds', code: 'ds3.3', label: 'Remaining Battery Life', labelCn: '电池剩余时间',
    category: 'system', exampleValue: 725760, unit: 's', source: 'system', providerKey: 'systemStats', nullable: true,
    requirement: 'System.Stats.batteryInDays support (Connect IQ API level 3.3.0+ on supported devices)',
    description: 'Garmin SDK remaining battery life converted from batteryInDays to rounded integer seconds.',
    descriptionCn: '将 Garmin SDK 的 batteryInDays 转换为四舍五入后的整数秒数。',
  }),
  token({ id: 'system.memory.free', code: 'ds4', label: 'Free Memory', labelCn: '可用内存', category: 'system', exampleValue: 65536, unit: 'bytes', source: 'system', providerKey: 'systemStats' }),
  token({ id: 'system.memory.total', code: 'ds6', label: 'Total Memory', labelCn: '总内存', category: 'system', exampleValue: 262144, unit: 'bytes', source: 'system', providerKey: 'systemStats', nullable: true, requirement: 'Total memory exposed by the device' }),
  token({ id: 'system.memory.used', code: 'ds7', label: 'Used Memory', labelCn: '已用内存', category: 'system', exampleValue: 196608, unit: 'bytes', source: 'system', providerKey: 'systemStats', nullable: true, requirement: 'Total and free memory exposed by the device' }),
  sensor('elevation', 'ds8', 'Elevation', '海拔', 32, 'm'),
  sensor('heartRate', 'ds9', 'Heart Rate', '心率', 72, 'bpm'),
  sensor('oxygenSaturation', 'ds10', 'Oxygen Saturation', '血氧饱和度', 97, '%'),
  sensor('pressure', 'ds11', 'Pressure', '气压', 101325, 'Pa'),
  sensor('temperature', 'ds12', 'Temperature', '温度', 24, '°C'),
  token({ id: 'user.restingHeartRate7DayAverage', code: 'ds14', label: '7-day Average Resting HR', labelCn: '七日平均静息心率', category: 'sensor', exampleValue: 58, unit: 'bpm', source: 'sensor', providerKey: 'userProfile', nullable: true, requirement: 'User profile resting heart-rate data' }),
  token({
    id: 'sensor.heartRateZone', code: 'ds15', label: 'Heart Rate Zone', labelCn: '心率区间',
    category: 'sensor', exampleValue: 3, enumValues: HEART_RATE_ZONE_VALUES, source: 'sensor',
    providerKey: 'userProfile.heartRateZones',
    description: 'Current generic-sport heart-rate zone using the user’s Garmin thresholds: 0 when heart rate or zone data is unavailable, or below the Zone 1 threshold; 1–4 between adjacent zone thresholds; 5 at or above the Zone 5 threshold.',
    descriptionCn: '使用 Garmin 用户“通用运动”心率区间阈值计算：无有效心率或区间数据、或心率低于 Z1 下限时返回 0；位于相邻区间阈值之间时返回 1–4；达到或超过 Z5 下限时返回 5。',
    requirement: 'Current heart-rate data and UserProfile heart-rate-zone support',
  }),
  sensor('bodyBattery', 'ds330', 'Body Battery', '身体电量', 68, '%'),
  token({
    id: 'sensor.bodyBatteryStage', code: 'ds330.1', label: 'Body Battery Stage', labelCn: '身体电量阶段',
    category: 'sensor', exampleValue: 2, enumValues: BODY_BATTERY_STAGE_VALUES, source: 'sensor',
    providerKey: 'sensorHistory.bodyBattery', nullable: true,
    requirement: 'Sensor history support for Body Battery',
    description: 'Body Battery stage: 0 below 25; 1 from 25 to below 50; 2 from 50 to below 75; 3 at or above 75.',
    descriptionCn: '身体电量阶段：原值低于 25 返回 0；25（含）至 50（不含）返回 1；50（含）至 75（不含）返回 2；75 及以上返回 3。',
  }),
  sensor('stress', 'ds331', 'Stress', '压力', 31),
  token({
    id: 'sensor.stressStage', code: 'ds331.1', label: 'Stress Stage', labelCn: '压力阶段',
    category: 'sensor', exampleValue: 1, enumValues: STRESS_STAGE_VALUES, source: 'sensor',
    providerKey: 'sensorHistory.stress', nullable: true,
    requirement: 'Sensor history support for Stress',
    description: 'Stress stage: 0 below 25; 1 from 25 to below 50; 2 from 50 to below 75; 3 at or above 75.',
    descriptionCn: '压力阶段：原值低于 25 返回 0；25（含）至 50（不含）返回 1；50（含）至 75（不含）返回 2；75 及以上返回 3。',
  }),

  token({
    id: 'weather.current.conditionCode', code: 'w01', label: 'Weather Code', labelCn: '天气代码',
    category: 'weather', exampleValue: 2, enumValues: WRISTO_WEATHER_CODE_VALUES, source: 'weather',
    description: 'Current weather normalized to the Wristo weather code.',
    descriptionCn: '当前天气归一化后的 Wristo 精简天气代码。',
    updateFrequency: 'network', providerKey: 'currentWeather', nullable: true,
    requirement: 'Toybox.Weather current conditions or synced Wristo weather data',
  }),
  weather('conditionText', 'w02', 'Condition Text', '天气状况', 'Partly Cloudy', 'string'),
  weather('feelsLikeTemperature', 'w03', 'Feels Like Temperature', '体感温度', 28, 'number', '°C'),
  weather('highTemperature', 'w04', 'High Temperature', '最高温度', 31, 'number', '°C'),
  weather('lowTemperature', 'w05', 'Low Temperature', '最低温度', 23, 'number', '°C'),
  weather('observationLocationName', 'w06', 'Observation Location', '观测地点', 'Shanghai', 'string'),
  weather('precipitationChance', 'w08', 'Precipitation', '降水概率', 35, 'number', '%'),
  token({
    id: 'weather.current.precipitationLevel', code: 'w08.1', label: 'Precipitation Level', labelCn: '降水概率阶段',
    category: 'weather', exampleValue: 1, enumValues: PRECIPITATION_LEVEL_VALUES, source: 'weather',
    updateFrequency: 'network', providerKey: 'currentWeather', nullable: true,
    requirement: 'Toybox.Weather current conditions or synced Wristo weather data',
    description: 'Precipitation stage: 0 below 30%; 1 from 30% to below 70%; 2 at or above 70%.',
    descriptionCn: '降水概率阶段：原值低于 30% 返回 0；30%（含）至 70%（不含）返回 1；70% 及以上返回 2。',
  }),
  weather('humidity', 'w09', 'Humidity', '湿度', 63, 'number', '%'),
  token({
    id: 'weather.current.humidityLevel', code: 'w09.1', label: 'Humidity Level', labelCn: '湿度阶段',
    category: 'weather', exampleValue: 2, enumValues: HUMIDITY_LEVEL_VALUES, source: 'weather',
    updateFrequency: 'network', providerKey: 'currentWeather', nullable: true,
    requirement: 'Toybox.Weather current conditions or synced Wristo weather data',
    description: 'Humidity stage: 0 below 40%; 1 from 40% through 60%; 2 above 60%.',
    descriptionCn: '湿度阶段：原值低于 40% 返回 0；40% 至 60%（含边界）返回 1；高于 60% 返回 2。',
  }),
  weather('temperature', 'w10', 'Temperature', '当前温度', 27, 'number', '°C'),
  token({
    id: 'weather.current.temperatureLevel', code: 'w10.1', label: 'Temperature Level', labelCn: '温度阶段',
    category: 'weather', exampleValue: 2, enumValues: TEMPERATURE_LEVEL_VALUES, source: 'weather',
    updateFrequency: 'network', providerKey: 'currentWeather', nullable: true,
    requirement: 'Toybox.Weather current conditions or synced Wristo weather data',
    description: 'Celsius temperature stage: 0 below 10°C; 1 from 10°C to below 18°C; 2 from 18°C through 25°C; 3 above 25°C.',
    descriptionCn: '摄氏温度阶段：原值低于 10°C 返回 0；10°C（含）至 18°C（不含）返回 1；18°C（含）至 25°C（含）返回 2；高于 25°C 返回 3。',
  }),
  weather('windBearing', 'w11', 'Wind Bearing', '风向角度', 135, 'number', '°'),
  weather('windSpeed', 'w12', 'Wind Speed', '风速', 4.2, 'number', 'm/s'),
  astronomy({
    id: 'astronomy.moonAge', code: 'as3', label: 'Moon Age', labelCn: '月龄',
    exampleValue: 14, enumValues: MOON_AGE_VALUES,
    description: 'Locally calculated moon age from 1 through 29.',
    descriptionCn: '根据本地日期计算的月龄，范围为 1–29。',
  }),
  astronomy({
    id: 'astronomy.moonPhase', code: 'as3.1', label: 'Moon Phase', labelCn: '月相阶段',
    exampleValue: 4, enumValues: MOON_PHASE_VALUES,
    description: 'Eight-stage moon phase derived from the locally calculated moon age.',
    descriptionCn: '根据本地计算月龄归纳的八阶段月相。',
  }),
  astronomy({
    id: 'astronomy.moonIllumination', code: 'as3.2', label: 'Moon Illumination', labelCn: '月面照明百分比',
    exampleValue: 100, unit: '%',
    description: 'Locally calculated illuminated fraction of the Moon as an integer percentage from 0 through 100.',
    descriptionCn: '本地计算的月面受光比例，返回 0–100 的整数百分比。',
  }),
  astronomy({
    id: 'astronomy.daysUntilFullMoon', code: 'as3.3', label: 'Days Until Full Moon', labelCn: '距下一次满月天数',
    exampleValue: 0, unit: 'days',
    description: 'Whole days until the next full moon, from 0 through 29.',
    descriptionCn: '距离下一次满月的整数天数，范围为 0–29。',
  }),

  chineseCalendar('lunar.date', 'cn1', 'Lunar Date', '农历月日', '七月初四'),
  chineseCalendar('lunar.year', 'cn1.1', 'Lunar Year', '农历年序号', 2026, 'number'),
  chineseCalendar('lunar.yearText', 'cn1.2', 'Lunar Year Text', '农历年文本', '二〇二六年'),
  chineseCalendar('lunar.month', 'cn1.3', 'Lunar Month', '农历月序号', 7, 'number'),
  chineseCalendar('lunar.monthText', 'cn1.4', 'Lunar Month Text', '农历月文本', '七月'),
  chineseCalendar('lunar.day', 'cn1.5', 'Lunar Day', '农历日序号', 4, 'number'),
  chineseCalendar('lunar.dayText', 'cn1.6', 'Lunar Day Text', '农历日文本', '初四'),
  chineseCalendar('lunar.leap', 'cn1.7', 'Leap Month', '是否闰月', false, 'boolean'),
  chineseCalendar('festival.today', 'cn2', 'Festival / Solar Term Today', '节日节气', '中秋节', 'string', true),
  chineseCalendar('festival.gregorian.next', 'cn2.1', 'Next Gregorian Festival', '下一个公历节日', '国庆节'),
  chineseCalendar('festival.gregorian.suffix', 'cn2.2', 'Gregorian Festival Distance Suffix', '公历节日距离后缀', '+10', 'string', true),
  chineseCalendar('solarTerm.next', 'cn2.3', 'Next Solar Term', '下一个节气', '处暑'),
  token({
    id: 'chinaCalendar.solarTerm.nextIndex', code: 'cn2.3.1', label: 'Next Solar Term Index', labelCn: '下一个节气编号',
    category: 'date-time', exampleValue: 13, enumValues: SOLAR_TERM_INDEX_VALUES, source: 'wristo', providerKey: 'chineseCalendar',
    nullable: true, appLanguages: ['zhs'], wfbEquivalent: undefined,
    description: 'Numeric index of the next solar term, from 0 for Beginning of Spring through 23 for Greater Cold.',
    descriptionCn: '下一个节气的数字编号：立春为 0，依次排列，大寒为 23。',
  }),
  chineseCalendar('solarTerm.suffix', 'cn2.4', 'Solar-Term Distance Suffix', '节气距离后缀', '+6', 'string', true),
  chineseCalendar('ganzhi.year', 'cn3', 'Traditional Ganzhi Year', '传统干支年', '丙午'),
  chineseCalendar('pillar.year', 'cn3.1', 'Year Pillar', '四柱年柱', '丙午'),
  chineseCalendar('pillar.month', 'cn3.2', 'Month Pillar', '四柱月柱', '丙申'),
  chineseCalendar('pillar.day', 'cn3.3', 'Day Pillar', '四柱日柱', '壬戌'),
  chineseCalendar('pillar.hour', 'cn3.4', 'Hour Pillar', '四柱时柱', '戊申'),
  chineseCalendar('zodiac.name', 'cn4', 'Zodiac', '生肖', '马'),
  chineseCalendar('zodiac.year', 'cn4.1', 'Zodiac Year', '生肖年', '马年'),
  token({
    id: 'chinaCalendar.zodiac.yearIndex', code: 'cn4.1.1', label: 'Zodiac Year Index', labelCn: '生肖编号',
    category: 'date-time', exampleValue: 6, enumValues: ZODIAC_INDEX_VALUES, source: 'wristo', providerKey: 'chineseCalendar',
    nullable: true, appLanguages: ['zhs'], wfbEquivalent: undefined,
    description: 'Numeric index of the zodiac year, from 0 for Rat through 11 for Pig.',
    descriptionCn: '生肖年的数字编号：鼠为 0，依次排列，猪为 11。',
  }),
  chineseCalendar('shichen.branch', 'cn4.2', 'Shichen Branch', '当前时支', '申'),
  chineseCalendar('shichen.name', 'cn4.3', 'Shichen', '当前时辰', '申时'),
  chineseCalendar('solar.yearText', 'cn5', 'Gregorian Year Text', '公历年文本', '2026年'),
  chineseCalendar('solar.monthText', 'cn5.1', 'Gregorian Month Text', '公历月数字文本', '8月'),
  chineseCalendar('solar.monthZh', 'cn5.2', 'Chinese Month Text', '公历月中文文本', '八月'),
  chineseCalendar('solar.dayText', 'cn5.3', 'Gregorian Day Text', '公历日数字文本', '16日'),
  chineseCalendar('solar.dayZh', 'cn5.4', 'Chinese Day Text', '公历日中文文本', '十六日'),
  chineseCalendar('solar.weekShort', 'cn5.5', 'Chinese Weekday Short', '中文星期简称', '周日'),
  chineseCalendar('solar.weekLong', 'cn5.6', 'Chinese Weekday Long', '中文星期全称', '星期日'),

  token({ id: 'status.charging', code: 'wr.charging', label: 'Charging', labelCn: '正在充电', category: 'status', valueType: 'boolean', exampleValue: false, source: 'wristo', updateFrequency: 'event', providerKey: 'systemStats', nullable: true, requirement: 'Charging status exposed by the device', wfbEquivalent: undefined }),
  token({ id: 'status.phoneConnected', code: 'wr.phoneConnected', label: 'Phone Connected', labelCn: '手机已连接', category: 'status', valueType: 'boolean', exampleValue: true, source: 'wristo', updateFrequency: 'event', providerKey: 'deviceSettings', nullable: true, requirement: 'Phone connection status exposed by the device', wfbEquivalent: undefined }),
  token({ id: 'status.bluetoothConnected', code: 'wr.bluetoothConnected', label: 'Bluetooth Connected', labelCn: '蓝牙已连接', category: 'status', valueType: 'boolean', exampleValue: true, source: 'wristo', updateFrequency: 'event', providerKey: 'deviceSettings', nullable: true, requirement: 'Bluetooth indicator support', wfbEquivalent: undefined }),
  token({ id: 'status.doNotDisturb', code: 'wr.dnd', label: 'Do Not Disturb', labelCn: '勿扰模式', category: 'status', valueType: 'boolean', exampleValue: false, source: 'wristo', updateFrequency: 'event', providerKey: 'deviceSettings', nullable: true, requirement: 'Do Not Disturb status exposed by the device', wfbEquivalent: undefined }),
]
