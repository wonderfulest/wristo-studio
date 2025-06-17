import { alignmentIcons, layoutIcons } from './icons'
import { usePropertiesStore } from '@/stores/properties'

// 字体大小选项
export const fontSizes = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204, 216, 228, 240, 264, 288, 312]

// 获取字体大小, step: 步长
// 1: 加大字体, 也可以为其他正数
// -1: 减小字体
export const getFontSizeByStep = (fontSize, step) => {
  const index = fontSizes.indexOf(fontSize)
  const newIndex = index + step
  if (newIndex >= 0 && newIndex < fontSizes.length) {
    return fontSizes[newIndex]
  }
  return fontSize
}

// 水平对齐方式选项
export const originXOptions = [
  { value: 'left', label: '左对齐', icon: alignmentIcons.left },
  { value: 'center', label: '居中', icon: alignmentIcons.center },
  { value: 'right', label: '右对齐', icon: alignmentIcons.right }
]

// 垂直对齐方式选项
export const originYOptions = [
  { value: 'top', label: '向上', icon: alignmentIcons.top },
  { value: 'center', label: '居中', icon: alignmentIcons.middle },
  { value: 'bottom', label: '向下', icon: alignmentIcons.bottom }
]

// 时间格式选项
export const TimeFormatOptions = [
  { value: 0, label: 'HH:mm', example: '12:34' },
  { value: 1, label: 'HH:mm:ss', example: '12:34:56' }, // 例如: 12:34:56
  { value: 2, label: 'HH', example: '12' },
  { value: 3, label: 'mm', example: '34' },
  { value: 4, label: 'ss', example: '56' },
  { value: 5, label: 'HH:', example: '12:' },
  { value: 6, label: ':mm', example: ':34' },
  { value: 7, label: 'A', example: 'PM' }, // AM/PM/24H
  { value: 8, label: 'a', example: 'pm' } // am/pm/24h
]

// 日期格式选项
export const DateFormatOptions = [
  // 涵盖星期、月份和日子等
  { value: 8, label: 'ddd DD', example: 'Mon 05' }, // 例如: Mon 05
  { value: 9, label: 'MMM D, ddd', example: 'Sep 5, Mon' }, // 例如: Sep 5, Mon
  { value: 10, label: 'MMM D, dddd', example: 'Sep 5, Monday' }, // 例如: Sep 5, Monday
  // 不涵盖星期、月份和日子等
  { value: 0, label: 'DD', example: '05' }, // 例如: 05
  { value: 1, label: 'ddd', example: 'Mon' }, // 例如: Mon
  { value: 2, label: 'dddd', example: 'Monday' }, // 星期几
  { value: 3, label: 'Do', example: '5th' }, // 例如: 5th
  { value: 4, label: 'MMM', example: 'Sep' }, // 例如: Sep
  { value: 5, label: 'MMMM', example: 'September' }, // 例如: September
  { value: 6, label: 'MMM D', example: 'Sep 5' }, // 例如: Sep 5
  { value: 7, label: 'MMMM D', example: 'September 5' }, // 例如: September 5

  // 涵盖星期、月份和日子等
  { value: 11, label: 'MMMM, D dddd', example: 'September, 5 Monday' }, // 例如: September, 5 Monday
  { value: 12, label: 'dddd, MMMM D', example: 'Monday, September 5' }, // 例如: Monday, September 5

  // 带年份
  { value: 13, label: 'MMM D, YYYY', example: 'Sep 5, 2023' }, // 例如: Sep 5, 2023
  { value: 14, label: 'D MMM YYYY', example: '5 Sep 2023' }, // 例如: 5 Sep 2023
  { value: 15, label: 'DD.MM.YYYY', example: '05.09.2023' }, // 例如: 05.09.2023
  { value: 16, label: 'MM/DD/YYYY', example: '09/05/2023' }, // 例如: 09/05/2023
  { value: 17, label: 'YYYY-MM-DD', example: '2023-09-05' }, // 例如: 2023-09-05
  { value: 18, label: 'MMMM Do, YYYY', example: 'September 5th, 2023' }, // 例如: September 5th, 2023
  { value: 19, label: 'MMM D, YYYY, dddd', example: 'Sep 5, 2023, Monday' } // 例如: Sep 5, 2023, Monday
]

// 布局方式选项
export const LayoutOptions = [
  { value: ':LAYOUT_TYPES_CENTER', label: '水平居中', icon: layoutIcons[':LAYOUT_TYPES_CENTER'] },
  { value: ':LAYOUT_TYPES_LEFT', label: '水平向左', icon: layoutIcons[':LAYOUT_TYPES_LEFT'] },
  { value: ':LAYOUT_TYPES_RIGHT', label: '水平向右', icon: layoutIcons[':LAYOUT_TYPES_RIGHT'] }
]

// 数据类型选项
// 包括：数据项、目标、图表
export const DataTypeOptions = [
  {
    labelCn: '心率',
    metricSymbol: ':FIELD_TYPE_HEART_RATE',
    value: 0,
    defaultValue: '80',
    icon: '\u0030',
    unit: 'bpm',
    label: 'Heart Rate',
    enLabel: {
      short: 'HR',
      medium: 'HeartRt',
      long: 'Heart Rate'
    }
  },
  {
    labelCn: '步数',
    metricSymbol: ':FIELD_TYPE_STEPS',
    value: 1,
    defaultValue: '1000',
    icon: '\u0031',
    unit: 'steps',
    label: 'Steps',
    enLabel: {
      short: 'Step',
      medium: 'Steps',
      long: 'Step Count'
    }
  },
  {
    labelCn: '卡路里',
    metricSymbol: ':FIELD_TYPE_CALORIES',
    value: 2,
    defaultValue: '200',
    icon: '\u0032',
    unit: 'kcal',
    label: 'Calories',
    enLabel: {
      short: 'Cal',
      medium: 'Calories',
      long: 'Calories'
    }
  },
  {
    labelCn: '爬楼',
    metricSymbol: ':FIELD_TYPE_FLOORS_CLIMBED',
    value: 3,
    defaultValue: '10',
    icon: '\u0033',
    unit: 'floors',
    label: 'Floors Climbed',
    enLabel: {
      short: 'Flr',
      medium: 'Floors',
      long: 'Floor Climb'
    }
  },
  {
    labelCn: '海拔',
    metricSymbol: ':FIELD_TYPE_ALTITUDE',
    value: 4,
    defaultValue: '0',
    icon: '\u0034',
    unit: 'm',
    label: 'Altitude',
    enLabel: {
      short: 'Alt',
      medium: 'Altitude',
      long: 'Altitude'
    }
  },
  {
    labelCn: '今日距离',
    metricSymbol: ':FIELD_TYPE_DISTANCE',
    value: 5,
    defaultValue: '5',
    icon: '\u0045',
    unit: 'km',
    label: 'Distance',
    enLabel: {
      short: 'Dist',
      medium: 'Distance',
      long: 'Total Dist'
    }
  },
  // {
  //   labelCn: '日出和日落 (废弃)',
  //   metricSymbol: ':FIELD_TYPE_SUN_RISE_SET',
  //   value: 6,
  //   defaultValue: '0',
  //   icon: '\u0021',
  //   unit: '',
  //   label:  'Next Sunrise or Sunset',
  //   enLabel: {
  //     short: 'Sun',
  //     medium: 'Sunrise',
  //     long: 'Sun Rise'
  //   }
  // },
  {
    labelCn: '日出',
    metricSymbol: ':FIELD_TYPE_SUN_RISE',
    value: 7,
    defaultValue: '6',
    icon: '\u0060',
    unit: '',
    label: 'Sunrise',
    enLabel: {
      short: 'Rise',
      medium: 'Sunrise',
      long: 'Sunrise Time'
    }
  },
  {
    labelCn: '日落',
    metricSymbol: ':FIELD_TYPE_SUN_SET',
    value: 8,
    defaultValue: '18',
    icon: '\u0061',
    unit: '',
    label: 'Sunset',
    enLabel: {
      short: 'Set',
      medium: 'Sunset',
      long: 'Sunset Time'
    }
  },
  {
    labelCn: '设备电量',
    metricSymbol: ':FIELD_TYPE_BATTERY',
    value: 9,
    defaultValue: '100',
    icon: '\u0026',
    unit: '%',
    label: 'Battery',
    enLabel: {
      short: 'Bat',
      medium: 'Battery',
      long: 'Battery Lvl'
    }
  },
  {
    labelCn: '每日活动时间',
    metricSymbol: ':FIELD_TYPE_DAYLY_ACTIVE_MINUTES',
    value: 10,
    defaultValue: '30',
    icon: '\u0044',
    unit: 'min',
    label: 'Active Minutes (Daily)',
    enLabel: {
      short: 'ActM',
      medium: 'ActvMin',
      long: 'Daily Active'
    }
  },
  {
    labelCn: '每周活动时间',
    metricSymbol: ':FIELD_TYPE_WEEKLY_ACTIVE_MINUTES',
    value: 11,
    defaultValue: '150',
    icon: '\u0040',
    unit: 'min',
    label: 'Weekly Active Minutes',
    enLabel: {
      short: 'WkAc',
      medium: 'WkActive',
      long: 'Weekly Activ'
    }
  },
  {
    labelCn: '周跑步距离',
    metricSymbol: ':FIELD_TYPE_WEEKLY_RUN_DISTANCE',
    value: 12,
    defaultValue: '10',
    icon: '\u0046',
    unit: 'km',
    label: 'Weekly Run Distance',
    enLabel: {
      short: 'Run',
      medium: 'RunDist',
      long: 'Run Distance'
    }
  },
  {
    labelCn: '周骑行距离',
    metricSymbol: ':FIELD_TYPE_WEEKLY_CYCLING_DISTANCE',
    value: 13,
    defaultValue: '15',
    icon: '\u0047',
    unit: 'km',
    label: 'Weekly Cycling Distance',
    enLabel: {
      short: 'Cycle',
      medium: 'CycleDist',
      long: 'Cycle Dist'
    }
  },
  {
    labelCn: '恢复时间',
    metricSymbol: ':FIELD_TYPE_TIME_TO_RECOVERY',
    value: 14,
    defaultValue: '24',
    icon: '\u0041',
    unit: 'h',
    label: 'Recovery',
    enLabel: {
      short: 'Recv',
      medium: 'RecvTime',
      long: 'Recovery T'
    }
  },
  {
    labelCn: '身体电量',
    metricSymbol: ':FIELD_TYPE_BODY_BATTERY',
    value: 15,
    defaultValue: '50',
    icon: '\u0035',
    unit: '%',
    label: 'Body Battery',
    enLabel: {
      short: 'BBat',
      medium: 'BodyBatt',
      long: 'Body Batt'
    }
  },
  {
    labelCn: '血氧饱和度',
    metricSymbol: ':FIELD_TYPE_PULSE_OX',
    value: 16,
    defaultValue: '95',
    icon: '\u003b',
    unit: '%',
    label: 'PulseOx',
    enLabel: {
      short: 'SpO2',
      medium: 'Pulse Ox',
      long: 'Blood Oxygen Saturation'
    }
  },
  {
    labelCn: '睡眠时间',
    metricSymbol: ':FIELD_TYPE_SLEEP_TIME',
    value: 17,
    defaultValue: '8',
    icon: '\u0021',
    label: 'Sleep (Daily)',
    enLabel: {
      short: 'Sleep',
      medium: 'Sleep Time',
      long: 'Total Sleep Hours'
    }
  },
  {
    labelCn: '压力',
    metricSymbol: ':FIELD_TYPE_STRESS',
    value: 18,
    defaultValue: '0',
    icon: '\u0036',
    unit: '',
    label: 'Stress',
    enLabel: {
      short: 'Strs',
      medium: 'Stress',
      long: 'Stress Lvl'
    }
  },
  {
    labelCn: '通知',
    metricSymbol: ':FIELD_TYPE_NOTIFICATIONS',
    value: 19,
    defaultValue: '0',
    icon: '\u0025',
    unit: '',
    label: 'Notifications',
    enLabel: {
      short: 'Ntf',
      medium: 'Notif',
      long: 'Notif Cnt'
    }
  },
  {
    labelCn: '闹钟',
    metricSymbol: ':FIELD_TYPE_ALARMS',
    value: 20,
    defaultValue: '0',
    icon: '\u0024',
    unit: '',
    label: 'Alarms',
    enLabel: {
      short: 'Alm',
      medium: 'Alarms',
      long: 'Alarm Cnt'
    }
  },
  {
    labelCn: '蓝牙连接状态',
    metricSymbol: ':INDICATOR_TYPE_BLUETOOTH',
    value: 21,
    defaultValue: '1',
    icon: '\u0022',
    unit: '',
    label: 'Bluetooth',
    enLabel: {
      short: 'BT',
      medium: 'Bluetooth',
      long: 'Bluetooth Connection'
    }
  },
  {
    labelCn: '闹钟',
    metricSymbol: ':INDICATOR_TYPE_ALARM',
    value: 22,
    defaultValue: '1',
    icon: '\u0022',
    unit: '',
    label: 'Alarms',
    enLabel: {
      short: 'Alm',
      medium: 'Alarms',
      long: 'Alarm Cnt'
    }
  },
  {
    labelCn: '消息通知',
    metricSymbol: ':INDICATOR_TYPE_NOTIFICATIONS',
    value: 23,
    defaultValue: '1',
    icon: '\u0022',
    unit: '',
    label: 'Notifications',
    enLabel: {
      short: 'Ntf',
      medium: 'Notif',
      long: 'Notif Cnt'
    }
  },
  // {
  //   labelCn: '勿扰时间',
  //   metricSymbol: ':INDICATOR_TYPE_DISTURB',
  //   value: 24,
  //   defaultValue: '1',
  //   icon: '\u0022',
  //   unit: '',
  //   label:  'Bluetooth/Notifications',
  //   enLabel: {
  //     short: 'Dnt',
  //     medium: 'Dnt',
  //     long: 'Dnt'
  //   }
  // },
  // {
  //   labelCn: '天气',
  //   metricSymbol: ':FIELD_TYPE_WEATHER',
  //   value: 30,
  //   defaultValue: '25°C',
  //   icon: '\uF000',
  //   unit: '',
  //   label:  'Weather',
  //   enLabel: {
  //     short: 'Wthr',
  //     medium: 'Weather',
  //     long: 'Condition'
  //   }
  // },
  // {
  //   labelCn: '温度',
  //   metricSymbol: ':FIELD_TYPE_TEMPERATURE',
  //   value: 31,
  //   defaultValue: '25°C',
  //   icon: '\u0062',
  //   unit: '°C',
  //   label:  'Temperature',
  //   enLabel: {
  //     short: 'Temp',
  //     medium: 'Temperature',
  //     long: 'Current Temperature'
  //   }
  // },
  // {
  //   labelCn: '体感温度',
  //   metricSymbol: ':FIELD_TYPE_FEELS_LIKE_TEMPERATURE',
  //   value: 32,
  //   defaultValue: '25°C',
  //   icon: '\u0021',
  //   unit: '°C',
  //   label:  'FeelsLikeTemperature',
  //   enLabel: {
  //     short: 'Fl',
  //     medium: 'FeelLike',
  //     long: 'Feels Like'
  //   }
  // },
  // {
  //   labelCn: '湿度',
  //   metricSymbol: ':FIELD_TYPE_HUMIDITY',
  //   value: 33,
  //   defaultValue: '50',
  //   icon: '\u0021',
  //   unit: '%',
  //   label:  'Humidity',
  //   enLabel: {
  //     short: 'Humid',
  //     medium: 'Humidity',
  //     long: 'Current Humidity'
  //   }
  // },
  // {
  //   labelCn: '风速',
  //   metricSymbol: ':FIELD_TYPE_WIND_SPEED',
  //   value: 34,
  //   defaultValue: '10',
  //   icon: '\u0021',
  //   unit: 'km/h',
  //   label:  'WindSpeed',
  //   enLabel: {
  //     short: 'Wind',
  //     medium: 'WindSpd',
  //     long: 'Wind Speed'
  //   }
  // },
  // {
  //   labelCn: '传感器温度',
  //   metricSymbol: ':FIELD_TYPE_SENSOR_TEMPERATURE',
  //   value: 35,
  //   defaultValue: '20',
  //   icon: '\u0021',
  //   unit: '°C',
  //   label:  'Sensor Temperature',
  //   enLabel: {
  //     short: 'Sensor',
  //     medium: 'Sensor Temp',
  //     long: 'Sensor Temperature'
  //   }
  // },
  // {
  //   labelCn: '天气描述',
  //   metricSymbol: ':FIELD_TYPE_WEATHER_DESCRIPTION',
  //   value: 36,
  //   defaultValue: 'Clear Sky',
  //   icon: '\u0021',
  //   unit: '',
  //   label:  'Weather',
  //   enLabel: {
  //     short: 'Sky',
  //     medium: 'Weather',
  //     long: 'Weather Description'
  //   }
  // },
  {
    labelCn: '呼吸频率',
    metricSymbol: ':FIELD_TYPE_RESPIRATION_RATE',
    value: 37,
    defaultValue: '16',
    icon: '\u0037',
    unit: 'brpm',
    label: 'Breaths per Min(if supported)',
    enLabel: {
      short: 'Resp',
      medium: 'RespRate',
      long: 'Resp Rate'
    }
  },
  {
    labelCn: '静息心率',
    metricSymbol: ':FIELD_TYPE_RESTING_HEARTRATE',
    value: 38,
    defaultValue: '70',
    icon: '\u0038',
    unit: 'bpm',
    label: 'Resting Heart Rate',
    enLabel: {
      short: 'RHR',
      medium: 'Rest HR',
      long: 'Resting Heart Rate'
    }
  },
  {
    labelCn: '周游泳距离',
    metricSymbol: ':FIELD_TYPE_WEEKLY_SWIMMING_DISTANCE',
    value: 39,
    defaultValue: '1',
    icon: '\u0048',
    unit: 'km',
    label: 'Weekly Swim Distance',
    enLabel: {
      short: 'Swim',
      medium: 'SwimDist',
      long: 'Swim Dist'
    }
  },
  {
    labelCn: '周步行距离',
    metricSymbol: ':FIELD_TYPE_WEEKLY_WALKING_DISTANCE',
    value: 40,
    defaultValue: '10',
    icon: '\u0049',
    unit: 'km',
    label: 'Weekly Walk Distance',
    enLabel: {
      short: 'Walk',
      medium: 'WalkDist',
      long: 'Walk Dist'
    }
  },
  // {
  //   labelCn: '每天最高温度',
  //   metricSymbol: ':FIELD_TYPE_TEMPERATURE_HIGH',
  //   value: 41,
  //   defaultValue: '30°C',
  //   icon: '\u0021',
  //   unit: '°C',
  //   label:  'Daily Temperature High',
  //   enLabel: {
  //     short: 'High',
  //     medium: 'High Temp',
  //     long: 'Today\'s High Temp'
  //   }
  // },
  // {
  //   labelCn: '每天最低温度',
  //   metricSymbol: ':FIELD_TYPE_TEMPERATURE_LOW',
  //   value: 42,
  //   defaultValue: '15°C',
  //   icon: '\u0021',
  //   unit: '°C',
  //   label:  'Daily Temperature Low',
  //   enLabel: {
  //     short: 'Low',
  //     medium: 'Low Temp',
  //     long: 'Today\'s Low Temp'
  //   }
  // },
  // {
  //   labelCn: '月相',
  //   metricSymbol: ':FIELD_TYPE_MOON_PHASE',
  //   value: 43,
  //   defaultValue: '15°C',
  //   icon: '\u0021',
  //   unit: '',
  //   label:  'Moon Phase',
  //   enLabel: {
  //     short: 'Moon',
  //     medium: 'Moon Phase',
  //     long: 'Moon Phase'
  //   }
  // },
  // {
  //   labelCn: '气压',
  //   metricSymbol: ':FIELD_TYPE_WEATHER_PRESSURE',
  //   value: 50,
  //   defaultValue: '1013',
  //   icon: '\u0063',
  //   unit: 'hPa',
  //   label:  'Barometer',
  //   enLabel: {
  //     short: 'Press',
  //     medium: 'Pressure',
  //     long: 'Barometric Pressure'
  //   }
  // },
  // {
  //   labelCn: '温度范围',
  //   metricSymbol: ':FIELD_TYPE_TEMPERATURE_RANGE',
  //   value: 51,
  //   defaultValue: '25',
  //   icon: '\u0021',
  //   unit: '°C',
  //   label:  'Temperature Range',
  //   enLabel: {
  //     short: 'Range',
  //     medium: 'Temp Range',
  //     long: 'Temperature Range'
  //   }
  // },
  // {
  //   labelCn: '紫外线指数',
  //   metricSymbol: ':FIELD_TYPE_WEATHER_UVINDEX',
  //   value: 52,
  //   defaultValue: '3',
  //   icon: '\u0021',
  //   unit: '',
  //   label:  'UVIndex',
  //   enLabel: {
  //     short: 'UV',
  //     medium: 'UV Index',
  //     long: 'Ultraviolet Index'
  //   }
  // },
  // {
  //   labelCn: '露点',
  //   metricSymbol: ':FIELD_TYPE_WEATHER_DEWPOINT',
  //   value: 53,
  //   defaultValue: '10',
  //   icon: '\u0021',
  //   unit: '°C',
  //   label:  'DewPoint',
  //   enLabel: {
  //     short: 'Dew',
  //     medium: 'Dew Point',
  //     long: 'Dew Point Temperature'
  //   }
  // },
  // {
  //   labelCn: '云量',
  //   metricSymbol: ':FIELD_TYPE_WEATHER_CLOUDS',
  //   value: 54,
  //   defaultValue: '50',
  //   icon: '\u0021',
  //   unit: '%',
  //   label:  'Clouds',
  //   enLabel: {
  //     short: 'Cloud',
  //     medium: 'Cloud Cover',
  //     long: 'Cloud Coverage Percent'
  //   }
  // },
  // {
  //   labelCn: '能见度',
  //   metricSymbol: ':FIELD_TYPE_WEATHER_VISIBILITY',
  //   value: 55,
  //   defaultValue: '10',
  //   icon: '\u0021',
  //   unit: 'km',
  //   label:  'Visibility',
  //   enLabel: {
  //     short: 'Vis',
  //     medium: 'Visibility',
  //     long: 'Visibility Distance'
  //   }
  // },
  {
    labelCn: 'VO2Max',
    metricSymbol: ':FIELD_TYPE_VO2_MAX',
    value: 57,
    defaultValue: '40',
    icon: '\u003a',
    unit: '',
    label: 'Vo2Max',
    enLabel: {
      short: 'VO2',
      medium: 'VO2 Max',
      long: 'Maximum Oxygen Uptake'
    }
  },
  // {
  //   labelCn: '位置信息',
  //   metricSymbol: ':FIELD_TYPE_LOCATION',
  //   value: 58,
  //   defaultValue: 'Los Angeles',
  //   icon: '\u0021',
  //   unit: '',
  //   label:  'Location',
  //   enLabel: {
  //     short: 'Loc',
  //     medium: 'Location',
  //     long: 'Current Location'
  //   }
  // },
  {
    labelCn: '年',
    metricSymbol: ':FIELD_TYPE_DATE_YEAR',
    value: 70,
    defaultValue: '2023',
    icon: '\u0021',
    unit: '',
    label: 'Year',
    enLabel: {
      short: 'Year',
      medium: 'Year',
      long: 'Current Year'
    }
  },
  {
    labelCn: '月',
    metricSymbol: ':FIELD_TYPE_DATE_MONTH',
    value: 71,
    defaultValue: '10',
    icon: '\u0021',
    label: 'Month',
    enLabel: {
      short: 'Mo',
      medium: 'Month',
      long: 'Current Month'
    }
  },
  {
    labelCn: '日',
    metricSymbol: ':FIELD_TYPE_DATE_DAY',
    value: 72,
    defaultValue: '10',
    icon: '\u0021',
    label: 'Day',
    enLabel: {
      short: 'Day',
      medium: 'Day',
      long: 'Day of Month'
    }
  },
  {
    labelCn: '星期几',
    metricSymbol: ':FIELD_TYPE_DATE_WEEKDAY',
    value: 76,
    defaultValue: '1',
    icon: '\u0021',
    label: 'Weekday',
    enLabel: {
      short: 'Wkday',
      medium: 'Weekday',
      long: 'Day of Week'
    }
  },
  {
    labelCn: '第几周',
    metricSymbol: ':FIELD_TYPE_DATE_YEARWEEK',
    value: 77,
    defaultValue: '29',
    icon: '\u0021',
    label: 'Week of Year',
    enLabel: {
      short: 'Wk',
      medium: 'Week',
      long: 'Week of Year'
    }
  },
  // ---------------------------- 目标数据项 --------------------------------
  {
    labelCn: '目标设备电量',
    metricSymbol: ':GOAL_TYPE_BATTERY',
    value: 100,
    defaultValue: '80',
    icon: '\u0026',
    unit: '%',
    label: 'Battery (Hide Percentage)',
    enLabel: {
      short: 'Bat',
      medium: 'Battery',
      long: 'Battery Goal'
    }
  },
  {
    labelCn: '目标步数',
    metricSymbol: ':GOAL_TYPE_STEPS',
    value: 101,
    defaultValue: '8000',
    icon: '\u0031',
    unit: 'steps',
    label: 'Steps',
    enLabel: {
      short: 'GStp',
      medium: 'GoalStep',
      long: 'Step Goal'
    }
  },
  {
    labelCn: '目标卡路里',
    metricSymbol: ':GOAL_TYPE_CALORIES',
    value: 102,
    defaultValue: '500',
    icon: '\u0032',
    unit: 'kcal',
    label: 'Calories (Manual Goal)',
    enLabel: {
      short: 'GCal',
      medium: 'GoalCal',
      long: 'Calorie Goal'
    }
  },
  {
    labelCn: '目标爬楼',
    metricSymbol: ':GOAL_TYPE_FLOORS_CLIMBED',
    value: 103,
    defaultValue: '20',
    icon: '\u0033',
    unit: 'floors',
    label: 'Floors Climbed',
    enLabel: {
      short: 'Floor',
      medium: 'Floor',
      long: 'Floor Goal'
    }
  },
  {
    labelCn: '目标心率',
    metricSymbol: ':GOAL_TYPE_HEART_RATE',
    value: 104,
    defaultValue: '120',
    icon: '\u0030',
    unit: 'bpm',
    label: 'Heart Rate',
    enLabel: {
      short: 'HR',
      medium: 'HR',
      long: 'Heart Rate'
    }
  },
  {
    labelCn: '目标身体电量',
    metricSymbol: ':GOAL_TYPE_BODY_BATTERY',
    value: 111,
    defaultValue: '60',
    icon: '\u0035',
    unit: '%',
    label: 'Body Battery',
    enLabel: {
      short: 'BdBat',
      medium: 'BodyBat',
      long: 'Body Battery'
    }
  },
  {
    labelCn: '目标每日活动时间',
    metricSymbol: ':GOAL_TYPE_DAYLY_ACTIVE_MINUTES',
    value: 105,
    defaultValue: '60',
    icon: '\u0044',
    unit: 'min',
    label: 'Active Minutes (Daily)',
    enLabel: {
      short: 'GAct',
      medium: 'GoalAct',
      long: 'Daily Active'
    }
  },
  {
    labelCn: '目标每周活动时间',
    metricSymbol: ':GOAL_TYPE_WEEKLY_ACTIVE_MINUTES',
    value: 106,
    defaultValue: '300',
    icon: '\u0044',
    unit: 'min',
    label: 'Weekly Active Minutes',
    enLabel: {
      short: 'GWkA',
      medium: 'GoalWkAc',
      long: 'Weekly Activ'
    }
  },
  {
    labelCn: '周跑步目标距离',
    metricSymbol: ':GOAL_TYPE_WEEKLY_RUN_DISTANCE',
    value: 107,
    defaultValue: '20',
    icon: '\u0046',
    unit: 'km',
    label: 'Weekly Run Distance',
    enLabel: {
      short: 'GRD',
      medium: 'GoalRunDist',
      long: 'Run Distance'
    }
  },
  {
    labelCn: '周骑行目标距离',
    metricSymbol: ':GOAL_TYPE_WEEKLY_CYCLING_DISTANCE',
    value: 108,
    defaultValue: '30',
    icon: '\u0047',
    unit: 'km',
    label: 'Weekly Cycling Distance',
    enLabel: {
      short: 'GCD',
      medium: 'GoalCycleDist',
      long: 'Cycle Distance'
    }
  },
  {
    labelCn: '周游泳目标距离',
    metricSymbol: ':GOAL_TYPE_WEEKLY_SWIMMING_DISTANCE',
    value: 109,
    defaultValue: '2',
    icon: '\u0048',
    unit: 'km',
    label: 'Weekly Swim Distance',
    enLabel: {
      short: 'GSD',
      medium: 'SwimDist',
      long: 'Swim Distance'
    }
  },
  {
    labelCn: '周步行目标距离',
    metricSymbol: ':GOAL_TYPE_WEEKLY_WALKING_DISTANCE',
    value: 110,
    defaultValue: '20',
    icon: '\u0049',
    unit: 'km',
    label: 'Weekly Walk Distance',
    enLabel: {
      short: 'GWD',
      medium: 'WalkDist',
      long: 'Walk Distance'
    }
  },
  {
    labelCn: '秒针',
    metricSymbol: ':GOAL_TYPE_SECOND_OF_MINUTE',
    value: 120,
    defaultValue: '40',
    icon: '\u0021',
    unit: '',
    label: 'Second',
    enLabel: {
      short: 'Sec',
      medium: 'Second',
      long: 'Second'
    }
  },
  // ---------------------------- 图表数据项 --------------------------------
  {
    labelCn: '7天步数',
    metricSymbol: ':CHART_TYPE_7DAYS_STEPS',
    value: 150,
    defaultValue: '10000',
    icon: '\u0021',
    unit: 'steps',
    label: '7 Days Steps',
    enLabel: {
      short: '7 Days Steps',
      medium: '7 Days Steps',
      long: '7 Days Steps'
    }
  },
  {
    labelCn: '7天活动分钟',
    metricSymbol: ':CHART_TYPE_7DAYS_ACTIVE_MINUTES',
    value: 151,
    defaultValue: '10000',
    icon: '\u0021',
    unit: 'min',
    label: '7 Days Active Minutes',
    enLabel: {
      short: '7 Days Active Minutes',
      medium: '7 Days Active Minutes',
      long: '7 Days Active Minutes'
    }
  },
  {
    labelCn: '7天爬楼',
    metricSymbol: ':CHART_TYPE_7DAYS_FLOORS_CLIMBED',
    value: 152,
    defaultValue: '10000',
    icon: '\u0021',
    unit: 'floors',
    label: '7 Days Floors Climbed',
    enLabel: {
      short: '7 Days Floors Climbed',
      medium: '7 Days Floors Climbed',
      long: '7 Days Floors Climbed'
    }
  },
  {
    labelCn: '7天卡路里',
    metricSymbol: ':CHART_TYPE_7DAYS_CALORIES',
    value: 153,
    defaultValue: '10000',
    icon: '\u0021',
    unit: 'kcal',
    label: '7 Days Calories',
    enLabel: {
      short: '7 Days Calories',
      medium: '7 Days Calories',
      long: '7 Days Calories'
    }
  },
  {
    labelCn: '7天距离',
    metricSymbol: ':CHART_TYPE_7DAYS_DISTANCE',
    value: 154,
    defaultValue: '10000',
    icon: '\u0021',
    unit: 'km',
    label: '7 Days Distance',
    enLabel: {
      short: '7 Days Calories',
      medium: '7 Days Calories',
      long: '7 Days Calories'
    }
  },
  {
    labelCn: '7天轮椅',
    metricSymbol: ':CHART_TYPE_7DAYS_PUSH',
    value: 155,
    defaultValue: '10000',
    icon: '\u0021',
    unit: 'km',
    label: '7 Days Wheelchair Distance',
    enLabel: {
      short: '7 Days Wheelchair Distance',
      medium: '7 Days Wheelchair Distance',
      long: '7 Days Wheelchair Distance'
    }
  },
  {
    labelCn: '7天轮椅距离',
    metricSymbol: ':CHART_TYPE_7DAYS_PUSH_DISTANCE',
    value: 156,
    defaultValue: '10000',
    icon: '\u0021',
    unit: 'km',
    label: '7 Days Push Distance',
    enLabel: {
      short: '7 Days Push Distance',
      medium: '7 Days Push Distance',
      long: '7 Days Push Distance'
    }
  }

]

// 获取指标配置信息
export function getMetricBySymbol(metricSymbol) {
  return DataTypeOptions.find((item) => item.metricSymbol === metricSymbol)
}

// 获取指标配置信息
export function getMetricByProperty(dataProperty, propertiesStore) {
  if (!dataProperty || !propertiesStore) return DataTypeOptions[0]
  const metric = propertiesStore[dataProperty].options.find((item) => {
    return item.value == propertiesStore[dataProperty].value
  })
  if (!metric) {
    return DataTypeOptions[0]
  }
  return metric
}

/**
 * 时钟指针样式
 */
export const HourHandOptions = [
  { name: '3', url: '/assets/analog/hands/hour/03-h.svg' },
  { name: 'hand1', url: '/assets/analog/hands/hour/hand1.svg' },
  { name: 'hand2', url: '/assets/analog/hands/hour/hand2.svg' },
  { name: 'hand3', url: '/assets/analog/hands/hour/hand3.svg' },
  { name: 'hand4', url: '/assets/analog/hands/hour/hand4.svg' },
  { name: 'hand5', url: '/assets/analog/hands/hour/hand5.svg' },
  { name: 'hand6', url: '/assets/analog/hands/hour/hand6.svg' },
  { name: 'hand7', url: '/assets/analog/hands/hour/hand7.svg' },
  { name: 'hand8', url: '/assets/analog/hands/hour/hand8.svg' },
  { name: 'hand9', url: '/assets/analog/hands/hour/hand9.svg' },
  { name: 'hand10', url: '/assets/analog/hands/hour/hand10.svg' },
  { name: 'hand11', url: '/assets/analog/hands/hour/hand11.svg' },
  { name: 'hand12', url: '/assets/analog/hands/hour/hand12.svg' },
  { name: 'hand21', url: '/assets/analog/hands/hour/hand13.svg' },
  { name: 'hand22', url: '/assets/analog/hands/hour/hand14.svg' },
  { name: 'hand23', url: '/assets/analog/hands/hour/hand15.svg' },
  { name: 'hand24', url: '/assets/analog/hands/hour/hand16.svg' },
]

export const MinuteHandOptions = [
  { name: '3', url: '/assets/analog/hands/minute/03-m.svg' },
  { name: 'hand1', url: '/assets/analog/hands/minute/hand1.svg' },
  { name: 'hand2', url: '/assets/analog/hands/minute/hand2.svg' },
  { name: 'hand3', url: '/assets/analog/hands/minute/hand3.svg' },
  { name: 'hand4', url: '/assets/analog/hands/minute/hand4.svg' },
  { name: 'hand5', url: '/assets/analog/hands/minute/hand5.svg' },
  { name: 'hand6', url: '/assets/analog/hands/minute/hand6.svg' },
  { name: 'hand7', url: '/assets/analog/hands/minute/hand7.svg' },
  { name: 'hand8', url: '/assets/analog/hands/minute/hand8.svg' },
  { name: 'hand9', url: '/assets/analog/hands/minute/hand9.svg' },
  { name: 'hand10', url: '/assets/analog/hands/minute/hand10.svg' },
  { name: 'hand11', url: '/assets/analog/hands/minute/hand11.svg' },
  { name: 'hand12', url: '/assets/analog/hands/minute/hand12.svg' },
  { name: 'hand21', url: '/assets/analog/hands/minute/hand13.svg' },
  { name: 'hand22', url: '/assets/analog/hands/minute/hand14.svg' },
  { name: 'hand23', url: '/assets/analog/hands/minute/hand15.svg' },
  { name: 'hand24', url: '/assets/analog/hands/minute/hand16.svg' },
]

export const SecondHandOptions = [
  { name: 'hand1', url: '/assets/analog/hands/second/1.svg' },
  { name: 'hand2', url: '/assets/analog/hands/second/2.svg' },
  { name: 'hand3', url: '/assets/analog/hands/second/3.svg' },
  { name: 'hand4', url: '/assets/analog/hands/second/4.svg' },
  { name: 'hand5', url: '/assets/analog/hands/second/5.svg' },
  { name: 'hand6', url: '/assets/analog/hands/second/6.svg' },
  { name: 'hand7', url: '/assets/analog/hands/second/7.svg' },
  { name: 'hand8', url: '/assets/analog/hands/second/8.svg' },
  // { name: 'hand9', url: '/assets/analog/hands/second/9.svg' },
  // { name: 'hand10', url: '/assets/analog/hands/second/10.svg' },
  // { name: 'hand11', url: '/assets/analog/hands/second/11.svg' },
  // { name: 'hand12', url: '/assets/analog/hands/second/12.svg' },
]

export const Ticks12Options = [
  { name: 'ticks1', url: '/assets/analog/dials/ticks-12/tick-12-1.svg' },
  { name: 'tick87', url: '/assets/analog/dials/ticks-12/tick-12-87.svg' },
  // { name: 'ticks3', url: '/assets/analog/dials/ticks-12/tick-12-3.svg' },
  // { name: 'ticks4', url: '/assets/analog/dials/ticks-12/tick-12-4.svg' },
]

export const Ticks60Options = [
  { name: 'tick1', url: '/assets/analog/dials/ticks-60/tick-60-1.svg' },
  { name: 'tick2', url: '/assets/analog/dials/ticks-60/2-tick-dots-60.svg' },
  { name: 'tick87', url: '/assets/analog/dials/ticks-60/tick-60-87.svg' },
  // { name: 'ticks3', url: '/assets/analog/dials/ticks-60/tick-60-3.svg' },
  // { name: 'ticks4', url: '/assets/analog/dials/ticks-60/tick-60-4.svg' },
]

export const RomansOptions = [
  { name: 'romans1', url: '/assets/analog/dials/romans/romans-1.svg' },
  { name: 'romans2', url: '/assets/analog/dials/romans/2_amiko_display.svg' },
  { name: 'romans87', url: '/assets/analog/dials/romans/romans-87.svg' },
  // { name: 'romans2', url: '/assets/analog/dials/romans/romans-2.svg' },
  // { name: 'romans3', url: '/assets/analog/dials/romans/romans-3.svg' },
]

