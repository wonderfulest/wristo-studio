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
  wfbEquivalent?: string
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
  exampleExpression: `(${input.code})`,
  wfbEquivalent: input.wfbEquivalent === undefined && !input.code.startsWith('wr.') ? input.code : input.wfbEquivalent,
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

export const PRACTICAL_EXPRESSION_TOKEN_DEFINITIONS: readonly ExpressionTokenDefinition[] = [
  time('year', 'tm1', 'Year', '年份', 2026),
  time('shortYear', 'tm1.1', 'Short Year', '两位年份', 26),
  time('month', 'tm2', 'Month', '月份', 8),
  time('dayOfMonth', 'tm3', 'Day of Month', '日期', 15),
  time('isoWeek', 'tm4', 'ISO Week', 'ISO 周数', 33),
  time('dayOfWeek', 'tm5', 'Day of Week', '星期', 7),
  time('hour24', 'tm6', 'Hour (24-hour)', '小时（24 小时制）', 14),
  token({ id: 'time.hour24FirstDigit', code: 'tm6.1', label: 'First Hour Digit (24-hour)', labelCn: '小时十位（24 小时制）', category: 'date-time', exampleValue: 1, source: 'time', providerKey: 'clock' }),
  token({ id: 'time.hour24FirstDigitNullable', code: 'tm6.0', label: 'Optional First Hour Digit (24-hour)', labelCn: '可空小时十位（24 小时制）', category: 'date-time', exampleValue: 1, source: 'time', providerKey: 'clock', nullable: true, description: 'First digit of the 24-hour value; null before 10:00.', descriptionCn: '24 小时制小时十位；小于 10 点时返回空值。' }),
  token({ id: 'time.hour24SecondDigit', code: 'tm6.2', label: 'Second Hour Digit (24-hour)', labelCn: '小时个位（24 小时制）', category: 'date-time', exampleValue: 4, source: 'time', providerKey: 'clock' }),
  time('hour12', 'tm7.3', 'Hour (12-hour)', '小时（12 小时制）', 2),
  time('deviceHour', 'tm7.4', 'Hour (Device Format)', '小时（设备格式）', 14),
  token({ id: 'time.hour12FirstDigitNullable', code: 'tm7.0', label: 'Optional First Hour Digit (12-hour)', labelCn: '可空小时十位（12 小时制）', category: 'date-time', exampleValue: null, source: 'time', providerKey: 'clock', nullable: true, description: 'First digit of the 12-hour value; null for single-digit hours.', descriptionCn: '12 小时制小时十位；个位数小时返回空值。' }),
  token({ id: 'time.hour12FirstDigit', code: 'tm7.1', label: 'First Hour Digit (12-hour)', labelCn: '小时十位（12 小时制）', category: 'date-time', exampleValue: 0, source: 'time', providerKey: 'clock' }),
  token({ id: 'time.hour12SecondDigit', code: 'tm7.2', label: 'Second Hour Digit (12-hour)', labelCn: '小时个位（12 小时制）', category: 'date-time', exampleValue: 2, source: 'time', providerKey: 'clock' }),
  time('minute', 'tm8', 'Minute', '分钟', 30),
  token({ id: 'time.minuteFirstDigitNullable', code: 'tm8.0', label: 'Optional First Minute Digit', labelCn: '可空分钟十位', category: 'date-time', exampleValue: 3, source: 'time', providerKey: 'clock', nullable: true, description: 'First minute digit; null before minute 10.', descriptionCn: '分钟十位；分钟数小于 10 时返回空值。' }),
  token({ id: 'time.minuteFirstDigit', code: 'tm8.1', label: 'First Minute Digit', labelCn: '分钟十位', category: 'date-time', exampleValue: 3, source: 'time', providerKey: 'clock' }),
  token({ id: 'time.minuteSecondDigit', code: 'tm8.2', label: 'Second Minute Digit', labelCn: '分钟个位', category: 'date-time', exampleValue: 0, source: 'time', providerKey: 'clock' }),
  time('second', 'tm9', 'Second', '秒', 45),
  token({ id: 'time.secondFirstDigitNullable', code: 'tm9.0', label: 'Optional First Second Digit', labelCn: '可空秒钟十位', category: 'date-time', exampleValue: 4, source: 'time', providerKey: 'clock', nullable: true, updateFrequency: 'second', description: 'First second digit; null before second 10.', descriptionCn: '秒钟十位；秒数小于 10 时返回空值。' }),
  token({ id: 'time.secondFirstDigit', code: 'tm9.3', label: 'First Second Digit', labelCn: '秒钟十位', category: 'date-time', exampleValue: 4, source: 'time', providerKey: 'clock', updateFrequency: 'second' }),
  token({ id: 'time.secondSecondDigit', code: 'tm9.4', label: 'Second Second Digit', labelCn: '秒钟个位', category: 'date-time', exampleValue: 5, source: 'time', providerKey: 'clock', updateFrequency: 'second' }),
  time('amPm', 'tm10', 'AM/PM', '上午/下午', 1),
  time('dayOfYear', 'tm11', 'Day of Year', '年内天数', 227),

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
  activity('moveBarLevel', 'ai11', 'Move Bar', '久坐提醒等级', 2),
  activity('stepsToday', 'ai12', 'Steps', '今日步数', 8240, 'steps'),
  activity('stepsGoal', 'ai13', 'Steps Goal', '步数目标', 10000, 'steps'),
  activity('respirationRate', 'ai14', 'Respiration Rate', '呼吸频率', 15, 'brpm'),

  token({ id: 'system.alarm.count', code: 'ds1', label: 'Alarm Count', labelCn: '闹钟数量', category: 'system', exampleValue: 1, source: 'system', providerKey: 'deviceSettings', nullable: true, requirement: 'Alarm access support' }),
  token({ id: 'system.notification.count', code: 'ds2', label: 'Notification Count', labelCn: '通知数量', category: 'system', exampleValue: 3, source: 'system', providerKey: 'deviceSettings', nullable: true, requirement: 'Notification count support' }),
  token({ id: 'system.battery.level', code: 'ds3', label: 'Battery Level', labelCn: '电池电量', category: 'system', exampleValue: 76, unit: '%', source: 'system', providerKey: 'systemStats' }),
  token({ id: 'system.memory.free', code: 'ds4', label: 'Free Memory', labelCn: '可用内存', category: 'system', exampleValue: 65536, unit: 'bytes', source: 'system', providerKey: 'systemStats' }),
  token({ id: 'system.memory.total', code: 'ds6', label: 'Total Memory', labelCn: '总内存', category: 'system', exampleValue: 262144, unit: 'bytes', source: 'system', providerKey: 'systemStats', nullable: true, requirement: 'Total memory exposed by the device' }),
  token({ id: 'system.memory.used', code: 'ds7', label: 'Used Memory', labelCn: '已用内存', category: 'system', exampleValue: 196608, unit: 'bytes', source: 'system', providerKey: 'systemStats', nullable: true, requirement: 'Total and free memory exposed by the device' }),
  sensor('elevation', 'ds8', 'Elevation', '海拔', 32, 'm'),
  sensor('heartRate', 'ds9', 'Heart Rate', '心率', 72, 'bpm'),
  sensor('oxygenSaturation', 'ds10', 'Oxygen Saturation', '血氧饱和度', 97, '%'),
  sensor('pressure', 'ds11', 'Pressure', '气压', 101325, 'Pa'),
  sensor('temperature', 'ds12', 'Temperature', '温度', 24, '°C'),
  token({ id: 'user.restingHeartRate7DayAverage', code: 'ds14', label: '7-day Average Resting HR', labelCn: '七日平均静息心率', category: 'sensor', exampleValue: 58, unit: 'bpm', source: 'sensor', providerKey: 'userProfile', nullable: true, requirement: 'User profile resting heart-rate data' }),
  sensor('bodyBattery', 'ds330', 'Body Battery', '身体电量', 68, '%'),
  sensor('stress', 'ds331', 'Stress', '压力', 31),

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
  weather('humidity', 'w09', 'Humidity', '湿度', 63, 'number', '%'),
  weather('temperature', 'w10', 'Temperature', '当前温度', 27, 'number', '°C'),
  weather('windBearing', 'w11', 'Wind Bearing', '风向角度', 135, 'number', '°'),
  weather('windSpeed', 'w12', 'Wind Speed', '风速', 4.2, 'number', 'm/s'),

  token({ id: 'status.charging', code: 'wr.charging', label: 'Charging', labelCn: '正在充电', category: 'status', valueType: 'boolean', exampleValue: false, source: 'wristo', updateFrequency: 'event', providerKey: 'systemStats', nullable: true, requirement: 'Charging status exposed by the device', wfbEquivalent: undefined }),
  token({ id: 'status.phoneConnected', code: 'wr.phoneConnected', label: 'Phone Connected', labelCn: '手机已连接', category: 'status', valueType: 'boolean', exampleValue: true, source: 'wristo', updateFrequency: 'event', providerKey: 'deviceSettings', nullable: true, requirement: 'Phone connection status exposed by the device', wfbEquivalent: undefined }),
  token({ id: 'status.bluetoothConnected', code: 'wr.bluetoothConnected', label: 'Bluetooth Connected', labelCn: '蓝牙已连接', category: 'status', valueType: 'boolean', exampleValue: true, source: 'wristo', updateFrequency: 'event', providerKey: 'deviceSettings', nullable: true, requirement: 'Bluetooth indicator support', wfbEquivalent: undefined }),
  token({ id: 'status.doNotDisturb', code: 'wr.dnd', label: 'Do Not Disturb', labelCn: '勿扰模式', category: 'status', valueType: 'boolean', exampleValue: false, source: 'wristo', updateFrequency: 'event', providerKey: 'deviceSettings', nullable: true, requirement: 'Do Not Disturb status exposed by the device', wfbEquivalent: undefined }),
]
