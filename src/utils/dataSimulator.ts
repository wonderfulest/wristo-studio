// 简单数据模拟引擎：根据数据名称返回一个模拟值
// 参考 Monkey C 中的 DataFetcher/DataProvider，但这里不做缓存和复杂逻辑

export interface SimulatedData {
  /** 用于界面显示的字符串 */
  display: string
  /** 可选的数值逻辑值 */
  numeric?: number | null
  /** 单位，例如 bpm、%、km 等 */
  unit?: string
  /** 简短标签，方便调试 */
  label?: string
}

/**
 * 根据数据名称返回一条模拟数据
 *
 * 这里只做非常轻量的映射，用于设计器中的预览效果
 */
export function getSimulatedDataByName(name: string): SimulatedData {
  const key = name.trim()

  switch (key) {
    // 心率
    case 'heart':
    case 'hr':
      return { display: '78', numeric: 78, unit: 'bpm', label: 'HR' }

    // 告警数量
    case 'alarms':
      return { display: '2', numeric: 2, unit: '', label: 'ALARMS' }

    // 通知数量
    case 'notifications':
      return { display: '5', numeric: 5, unit: '', label: 'NOTIF' }

    // 步数
    case 'steps':
      return { display: '8,432', numeric: 8432, unit: 'steps', label: 'STEPS' }

    // 卡路里
    case 'calories':
      return { display: '1,956', numeric: 1956, unit: 'kcal', label: 'CAL' }

    // 楼层
    case 'floors':
      return { display: '12', numeric: 12, unit: 'floors', label: 'FLOORS' }

    // 距离
    case 'distance':
      return { display: '5.2', numeric: 5.2, unit: 'km', label: 'DIST' }

    // 海拔
    case 'altitude':
      return { display: '328', numeric: 328, unit: 'm', label: 'ALT' }

    // 静息心率
    case 'restingHeart':
      return { display: '62', numeric: 62, unit: 'bpm', label: 'RHR' }

    // 电池
    case 'battery':
      return { display: '84', numeric: 84, unit: '%', label: 'BAT' }

    // 呼吸率
    case 'respiration':
    case 'resp':
      return { display: '15', numeric: 15, unit: 'brpm', label: 'RESP' }

    // 位置 & 地点
    case 'location':
    case 'loc':
      return { display: 'Shanghai', unit: '', label: 'LOC' }
    case 'position':
    case 'pos':
      return { display: '31.23, 121.47', unit: '', label: 'POS' }

    // 天气文本
    case 'weather':
    case 'wthr':
      return { display: 'Sunny', unit: '', label: 'WEATHER' }

    // 湿度
    case 'humidity':
    case 'hum':
      return { display: '48', numeric: 48, unit: '%', label: 'HUM' }

    // 风速 / 风向（角度）
    case 'windSpeed':
    case 'wind':
      return { display: '3.6', numeric: 3.6, unit: 'm/s', label: 'WIND' }
    case 'windDeg':
    case 'wdeg':
      return { display: '135', numeric: 135, unit: 'deg', label: 'WIND_DEG' }

    // 云量
    case 'clouds':
    case 'cld':
      return { display: 'scattered', unit: '', label: 'CLOUDS' }

    // AQI
    case 'aqi':
      return { display: 'GOOD', numeric: 32, unit: '', label: 'AQI' }
    case 'pm25':
      return { display: '18', numeric: 18, unit: 'µg/m³', label: 'PM2_5' }
    case 'pm10':
      return { display: '32', numeric: 32, unit: 'µg/m³', label: 'PM10' }

    // 身体电量 / 压力
    case 'bodyBattery':
    case 'bb':
      return { display: '72', numeric: 72, unit: '%', label: 'BODY' }
    case 'stress':
      return { display: '21', numeric: 21, unit: '', label: 'STRESS' }

    // 日出 / 日落
    case 'sunrise':
    case 'sr':
      return { display: '06:42', unit: '', label: 'SUNRISE' }
    case 'sunset':
    case 'ss':
      return { display: '18:12', unit: '', label: 'SUNSET' }

    // 名言 / 文本
    case 'quote':
    case 'qt':
      return {
        display: "Take care of your body. It's the only place you have to live.",
        unit: '',
        label: 'QUOTE',
      }

    // 睡眠时长（示例）
    case 'sleep':
      return { display: '7.5', numeric: 7.5, unit: 'h', label: 'SLEEP' }

    // 日期 / 时间相关
    case 'year':
    case 'yy':
      return { display: '2025', numeric: 2025, unit: '', label: 'YEAR' }
    case 'month':
    case 'mm':
      return { display: 'DEC', numeric: 12, unit: '', label: 'MONTH' }
    case 'day':
    case 'dd':
      return { display: '28', numeric: 28, unit: '', label: 'DAY' }
    case 'weekday':
    case 'wday':
      return { display: 'SAT', numeric: 6, unit: '', label: 'WEEKDAY' }
    case 'week':
    case 'wk':
      return { display: '52', numeric: 52, unit: '', label: 'WEEK' }
    case 'yearday':
    case 'yday':
      return { display: '362', numeric: 362, unit: '', label: 'YEARDAY' }

    default:
      // 未知字段：返回占位符，方便在画布上察觉问题
      return { display: `{{${key}}}`, unit: '', label: 'UNKNOWN' }
  }
}

/**
 * 获取用于展示的字符串值
 *
 * 等价于 Monkey C 里的 getDataValueByName，只返回 display 部分
 */
export function getDataValueByName(name: string): string {
  return getSimulatedDataByName(name).display
}
