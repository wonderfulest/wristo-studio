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

type SimState = {
  hr: number
  steps: number
  calories: number
  floors: number
  distanceKm: number
  altitudeM: number
  battery: number
  notifications: number
  alarms: number
  humidity: number
  windSpeed: number
  windDeg: number
  pm25: number
  pm10: number
  aqi: number
  bodyBattery: number
  stress: number
}

const simState: SimState = {
  hr: 78,
  steps: 8432,
  calories: 1956,
  floors: 12,
  distanceKm: 5.2,
  altitudeM: 328,
  battery: 84,
  notifications: 5,
  alarms: 2,
  humidity: 48,
  windSpeed: 3.6,
  windDeg: 135,
  pm25: 18,
  pm10: 32,
  aqi: 32,
  bodyBattery: 72,
  stress: 21,
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function randInt(min: number, max: number): number {
  const a = Math.min(min, max)
  const b = Math.max(min, max)
  return Math.floor(a + Math.random() * (b - a + 1))
}

function formatInt(n: number): string {
  return Number(n).toLocaleString('en-US')
}

function formatFloat(n: number, digits: number = 1): string {
  const v = Number(n)
  if (!Number.isFinite(v)) return String(n)
  return v.toFixed(digits)
}

export function tickSimulatedData(): void {
  simState.steps = Math.max(0, simState.steps + randInt(0, 9))
  simState.hr = clamp(simState.hr + randInt(-2, 3), 55, 165)
  simState.calories = Math.max(0, simState.calories + randInt(0, 3))
  simState.floors = Math.max(0, simState.floors + (Math.random() < 0.02 ? 1 : 0))
  simState.distanceKm = Math.max(0, simState.steps / 1600)

  simState.battery = clamp(simState.battery - (Math.random() < 0.01 ? 1 : 0), 0, 100)
  simState.notifications = clamp(simState.notifications + (Math.random() < 0.05 ? 1 : 0), 0, 99)
  simState.alarms = clamp(simState.alarms + (Math.random() < 0.01 ? 1 : 0), 0, 20)

  simState.humidity = clamp(simState.humidity + randInt(-1, 1), 0, 100)
  simState.windSpeed = clamp(simState.windSpeed + randInt(-1, 1) * 0.1, 0, 20)
  simState.windDeg = (simState.windDeg + randInt(-5, 5) + 360) % 360

  simState.pm25 = clamp(simState.pm25 + randInt(-1, 2), 0, 300)
  simState.pm10 = clamp(simState.pm10 + randInt(-1, 2), 0, 500)
  simState.aqi = clamp(simState.aqi + randInt(-2, 3), 0, 500)

  simState.bodyBattery = clamp(simState.bodyBattery + randInt(-1, 1), 0, 100)
  simState.stress = clamp(simState.stress + randInt(-2, 2), 0, 100)
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
      return { display: String(simState.hr), numeric: simState.hr, unit: 'bpm', label: 'HR' }

    // 告警数量
    case 'alarms':
      return { display: String(simState.alarms), numeric: simState.alarms, unit: '', label: 'ALARMS' }

    // 通知数量
    case 'notifications':
      return { display: String(simState.notifications), numeric: simState.notifications, unit: '', label: 'NOTIF' }

    // 步数
    case 'steps':
      return { display: formatInt(simState.steps), numeric: simState.steps, unit: 'steps', label: 'STEPS' }

    // 卡路里
    case 'calories':
      return { display: formatInt(simState.calories), numeric: simState.calories, unit: 'kcal', label: 'CAL' }

    // 楼层
    case 'floors':
      return { display: String(simState.floors), numeric: simState.floors, unit: 'floors', label: 'FLOORS' }

    // 距离
    case 'distance':
      return { display: formatFloat(simState.distanceKm, 1), numeric: simState.distanceKm, unit: 'km', label: 'DIST' }

    // 海拔
    case 'altitude':
      return { display: String(simState.altitudeM), numeric: simState.altitudeM, unit: 'm', label: 'ALT' }

    // 静息心率
    case 'restingHeart':
      return { display: '62', numeric: 62, unit: 'bpm', label: 'RHR' }

    // 电池
    case 'battery':
      return { display: String(simState.battery), numeric: simState.battery, unit: '%', label: 'BAT' }

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
      return { display: String(simState.humidity), numeric: simState.humidity, unit: '%', label: 'HUM' }

    // 风速 / 风向（角度）
    case 'windSpeed':
    case 'wind':
      return { display: formatFloat(simState.windSpeed, 1), numeric: simState.windSpeed, unit: 'm/s', label: 'WIND' }
    case 'windDeg':
    case 'wdeg':
      return { display: String(simState.windDeg), numeric: simState.windDeg, unit: 'deg', label: 'WIND_DEG' }

    // 云量
    case 'clouds':
    case 'cld':
      return { display: 'scattered', unit: '', label: 'CLOUDS' }

    // AQI
    case 'aqi':
      return { display: String(simState.aqi), numeric: simState.aqi, unit: '', label: 'AQI' }
    case 'pm25':
      return { display: String(simState.pm25), numeric: simState.pm25, unit: 'µg/m³', label: 'PM2_5' }
    case 'pm10':
      return { display: String(simState.pm10), numeric: simState.pm10, unit: 'µg/m³', label: 'PM10' }

    // 身体电量 / 压力
    case 'bodyBattery':
    case 'bb':
      return { display: String(simState.bodyBattery), numeric: simState.bodyBattery, unit: '%', label: 'BODY' }
    case 'stress':
      return { display: String(simState.stress), numeric: simState.stress, unit: '', label: 'STRESS' }

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
