const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520,
]

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
const MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']
const DAY_PREFIX = ['初', '十', '廿', '卅']
const DAY_NUMBERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const SHICHEN_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const CHINESE_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const WEEKDAYS_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEKDAYS_LONG = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const EN_ZODIACS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig']
const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SOLAR_FESTIVALS: Record<string, string> = {
  '01-01': '元旦',
  '05-01': '劳动节',
  '10-01': '国庆节',
}
const EN_SOLAR_FESTIVALS: Record<string, string> = {
  '01-01': 'New Year',
  '05-01': 'Labor Day',
  '10-01': 'National Day',
}
const EN_SOLAR_TERMS: Record<string, string> = {
  '02-04': 'Lichun',
  '04-05': 'Qingming',
  '06-21': 'Summer Sol.',
  '12-22': 'Winter Sol.',
}
const LUNAR_FESTIVALS: Record<string, string> = {
  '01-01': '春节',
  '01-15': '元宵',
  '05-05': '端午',
  '07-07': '七夕',
  '08-15': '中秋',
  '09-09': '重阳',
  '12-08': '腊八',
  '12-23': '小年',
}
const EN_LUNAR_FESTIVALS: Record<string, string> = {
  '01-01': 'Spring Fest.',
  '01-15': 'Lantern',
  '05-05': 'Dragon Boat',
  '07-07': 'Qixi',
  '08-15': 'Mid-Autumn',
  '09-09': 'Double Ninth',
  '12-08': 'Laba',
  '12-23': 'Little New Year',
}
const YI = ['祭祀', '出行', '交易', '嫁娶', '入宅', '动土', '安床', '开市']
const JI = ['动土', '远行', '嫁娶', '开市', '安葬', '入宅', '交易', '安床']

const SOLAR_TERM_NAMES = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
  '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
]
const SOLAR_TERM_MINUTES = [
  0, 21208, 42467, 63836, 85337, 107014, 128867, 150921,
  173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033,
  353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758,
]
const SOLAR_YEAR_MS = 31556925974.7
const SOLAR_TERM_EPOCH_MS = Date.UTC(1900, 0, 6, 2, 5)

export interface LunarDate {
  year: number
  month: number
  day: number
  isLeapMonth: boolean
  yearName: string
  monthName: string
  dayName: string
  ganzhiYear: string
  zodiacYear: string
}

export interface FourPillars {
  year: string
  month: string
  day: string
  hour: string
}

function lunarInfo(year: number) {
  return LUNAR_INFO[year - 1900] ?? LUNAR_INFO[0]
}

function leapMonth(year: number) {
  return lunarInfo(year) & 0xf
}

function leapDays(year: number) {
  return leapMonth(year) ? ((lunarInfo(year) & 0x10000) ? 30 : 29) : 0
}

function monthDays(year: number, month: number) {
  return (lunarInfo(year) & (0x10000 >> month)) ? 30 : 29
}

function lunarYearDays(year: number) {
  let sum = 348
  for (let bit = 0x8000; bit > 0x8; bit >>= 1) {
    if (lunarInfo(year) & bit) sum += 1
  }
  return sum + leapDays(year)
}

function key(month: number, day: number) {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function chineseNumber(value: number): string {
  if (value < 10) return CHINESE_DIGITS[value]
  if (value === 10) return '十'
  if (value < 20) return `十${CHINESE_DIGITS[value % 10]}`
  const tens = Math.floor(value / 10)
  return `${CHINESE_DIGITS[tens]}十${value % 10 ? CHINESE_DIGITS[value % 10] : ''}`
}

function lunarDayName(day: number) {
  if (day === 10) return '初十'
  if (day === 20) return '二十'
  if (day === 30) return '三十'
  return `${DAY_PREFIX[Math.floor(day / 10)]}${DAY_NUMBERS[(day - 1) % 10]}`
}

function ganzhiYear(year: number) {
  return `${STEMS[(year - 4) % 10]}${BRANCHES[(year - 4) % 12]}`
}

function zodiacYear(year: number) {
  return `${ZODIACS[(year - 4) % 12]}年`
}

function englishZodiac(year: number) {
  return EN_ZODIACS[(year - 4) % 12]
}

function isChineseLocale(locale: string | null | undefined) {
  const normalized = String(locale || '').trim().toLowerCase()
  return normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-tw'
}

function fallbackEnglishDate(date: Date) {
  return `${EN_MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`
}

export function getChineseLunarDate(date: Date): LunarDate | null {
  const solarYear = date.getFullYear()
  if (solarYear < 1900 || solarYear > 2099) return null
  let offset = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(1900, 0, 31)) / 86400000)
  let lunarYear = 1900
  let yearDays = 0

  while (lunarYear < 2100 && offset > 0) {
    yearDays = lunarYearDays(lunarYear)
    offset -= yearDays
    lunarYear += 1
  }
  if (offset < 0) {
    offset += yearDays
    lunarYear -= 1
  }

  const leap = leapMonth(lunarYear)
  let isLeapMonth = false
  let lunarMonth = 1
  let monthDaysCount = 0

  while (lunarMonth < 13 && offset > 0) {
    if (leap > 0 && lunarMonth === leap + 1 && !isLeapMonth) {
      lunarMonth -= 1
      isLeapMonth = true
      monthDaysCount = leapDays(lunarYear)
    } else {
      monthDaysCount = monthDays(lunarYear, lunarMonth)
    }
    offset -= monthDaysCount
    if (isLeapMonth && lunarMonth === leap + 1) {
      isLeapMonth = false
    }
    lunarMonth += 1
  }
  if (offset === 0 && leap > 0 && lunarMonth === leap + 1) {
    if (isLeapMonth) {
      isLeapMonth = false
    } else {
      isLeapMonth = true
      lunarMonth -= 1
    }
  }
  if (offset < 0) {
    offset += monthDaysCount
    lunarMonth -= 1
  }

  const lunarDay = offset + 1
  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeapMonth,
    yearName: `${String(lunarYear).split('').map((digit) => CHINESE_DIGITS[Number(digit)]).join('')}年`,
    monthName: `${isLeapMonth ? '闰' : ''}${MONTHS[lunarMonth - 1]}`,
    dayName: lunarDayName(lunarDay),
    ganzhiYear: ganzhiYear(lunarYear),
    zodiacYear: zodiacYear(lunarYear),
  }
}

function solarTermMoment(year: number, index: number): Date {
  let timestamp = SOLAR_TERM_EPOCH_MS + SOLAR_YEAR_MS * (year - 1900) + SOLAR_TERM_MINUTES[index] * 60000
  const targetLongitude = (285 + index * 15) % 360
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const longitude = apparentSolarLongitude(timestamp)
    const error = ((longitude - targetLongitude + 540) % 360) - 180
    timestamp -= error / 0.98564736 * 86400000
  }
  return new Date(timestamp)
}

function apparentSolarLongitude(timestamp: number): number {
  const julianDate = timestamp / 86400000 + 2440587.5
  const centuries = (julianDate - 2451545) / 36525
  const meanLongitude = 280.46646 + 36000.76983 * centuries + 0.0003032 * centuries * centuries
  const meanAnomaly = 357.52911 + 35999.05029 * centuries - 0.0001537 * centuries * centuries
  const anomalyRadians = meanAnomaly * Math.PI / 180
  const center = Math.sin(anomalyRadians) * (1.914602 - 0.004817 * centuries - 0.000014 * centuries * centuries)
    + Math.sin(2 * anomalyRadians) * (0.019993 - 0.000101 * centuries)
    + Math.sin(3 * anomalyRadians) * 0.000289
  const omega = (125.04 - 1934.136 * centuries) * Math.PI / 180
  const longitude = meanLongitude + center - 0.00569 - 0.00478 * Math.sin(omega)
  return ((longitude % 360) + 360) % 360
}

function sameLocalDay(date: Date, other: Date): boolean {
  return date.getFullYear() === other.getFullYear()
    && date.getMonth() === other.getMonth()
    && date.getDate() === other.getDate()
}

export function getSolarTerm(date: Date): string {
  const year = date.getFullYear()
  for (let index = 0; index < SOLAR_TERM_NAMES.length; index += 1) {
    if (sameLocalDay(date, solarTermMoment(year, index))) return SOLAR_TERM_NAMES[index]
  }
  return ''
}

export function getNextSolarTerm(date: Date): UpcomingChineseFestival | null {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  for (let days = 0; days <= 366; days += 1) {
    const candidate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + days, 12)
    const name = getSolarTerm(candidate)
    if (name) return { name, days }
  }
  return null
}

function ganzhiByIndex(index: number): string {
  const normalized = ((index % 60) + 60) % 60
  return `${STEMS[normalized % 10]}${BRANCHES[normalized % 12]}`
}

function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const adjustedYear = year + 4800 - a
  const adjustedMonth = month + 12 * a - 3
  return day
    + Math.floor((153 * adjustedMonth + 2) / 5)
    + 365 * adjustedYear
    + Math.floor(adjustedYear / 4)
    - Math.floor(adjustedYear / 100)
    + Math.floor(adjustedYear / 400)
    - 32045
}

function monthPillarIndex(date: Date): number {
  const year = date.getFullYear()
  const boundaryTerms = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
  let monthIndex = 11
  for (let index = 0; index < boundaryTerms.length; index += 1) {
    if (date.getTime() >= solarTermMoment(year, boundaryTerms[index]).getTime()) monthIndex = index
  }
  return monthIndex
}

export function getFourPillars(date: Date): FourPillars {
  const year = date.getFullYear()
  const lichun = solarTermMoment(year, 2)
  const pillarYear = date.getTime() < lichun.getTime() ? year - 1 : year
  const yearIndex = pillarYear - 4
  const yearPillar = ganzhiByIndex(yearIndex)
  const monthIndex = monthPillarIndex(date)
  const monthStem = (((yearIndex % 10 + 10) % 10) % 5 * 2 + 2 + monthIndex) % 10
  const monthBranch = (2 + monthIndex) % 12
  const monthPillar = `${STEMS[monthStem]}${BRANCHES[monthBranch]}`
  const dayIndex = julianDayNumber(year, date.getMonth() + 1, date.getDate()) + 49
  const dayPillar = ganzhiByIndex(dayIndex)
  const dayStem = ((dayIndex % 10) + 10) % 10
  const hourBranch = Math.floor(((date.getHours() + 1) % 24) / 2)
  const hourStem = (dayStem % 5 * 2 + hourBranch) % 10
  const hourPillar = `${STEMS[hourStem]}${BRANCHES[hourBranch]}`
  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
  }
}

export function getChineseFestival(date: Date) {
  const solarKey = key(date.getMonth() + 1, date.getDate())
  if (SOLAR_FESTIVALS[solarKey]) return SOLAR_FESTIVALS[solarKey]
  const solarTerm = getSolarTerm(date)
  if (solarTerm) return solarTerm
  const lunar = getChineseLunarDate(date)
  if (!lunar) return ''
  return LUNAR_FESTIVALS[key(lunar.month, lunar.day)] || ''
}

export function getSolarFestival(date: Date): string {
  return SOLAR_FESTIVALS[key(date.getMonth() + 1, date.getDate())] || ''
}

export function getLunarFestival(date: Date): string {
  const lunar = getChineseLunarDate(date)
  return lunar ? (LUNAR_FESTIVALS[key(lunar.month, lunar.day)] || '') : ''
}

export function getNextFestival(date: Date): UpcomingChineseFestival | null {
  for (let days = 0; days <= 366; days += 1) {
    const candidate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12)
    const name = getSolarFestival(candidate) || getLunarFestival(candidate)
    if (name) return { name, days }
  }
  return null
}

interface UpcomingChineseFestival {
  name: string
  days: number
}

export function getNextChineseFestival(date: Date): UpcomingChineseFestival | null {
  for (let days = 0; days <= 32; days += 1) {
    const candidate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12)
    const name = getChineseFestival(candidate)
    if (name) return { name, days }
  }
  return null
}

export function getEnglishFestivalOrSolarTerm(date: Date) {
  const solarKey = key(date.getMonth() + 1, date.getDate())
  if (EN_SOLAR_FESTIVALS[solarKey]) return EN_SOLAR_FESTIVALS[solarKey]
  if (EN_SOLAR_TERMS[solarKey]) return EN_SOLAR_TERMS[solarKey]
  const lunar = getChineseLunarDate(date)
  if (!lunar) return ''
  return EN_LUNAR_FESTIVALS[key(lunar.month, lunar.day)] || ''
}

export function getChineseYi(date: Date) {
  return `宜 ${YI[Math.floor(date.getTime() / 86400000) % YI.length]}`
}

export function getChineseJi(date: Date) {
  return `忌 ${JI[Math.floor(date.getTime() / 86400000) % JI.length]}`
}

export function getChineseShichen(date: Date) {
  const index = Math.floor(((date.getHours() + 1) % 24) / 2)
  return `${SHICHEN_BRANCHES[index]}时`
}

export function getChineseWeekday(date: Date, longFormat = false) {
  const weekdays = longFormat ? WEEKDAYS_LONG : WEEKDAYS_SHORT
  return weekdays[date.getDay()] || ''
}

export function formatChineseCulturalDate(date: Date, formatter: number, locale: string | null | undefined = 'zh') {
  const lunar = getChineseLunarDate(date)
  if (!lunar) return ''
  if (!isChineseLocale(locale)) {
    switch (formatter) {
      case 20:
        return `L${lunar.month}/${lunar.day}`
      case 22:
        return englishZodiac(lunar.year)
      case 23:
        return getEnglishFestivalOrSolarTerm(date) || fallbackEnglishDate(date)
      default:
        return fallbackEnglishDate(date)
    }
  }

  switch (formatter) {
    case 20:
      return `${lunar.monthName}${lunar.dayName}`
    case 21:
      return lunar.ganzhiYear
    case 22:
      return lunar.zodiacYear
    case 23: {
      const nextEvent = getNextChineseFestival(date)
      if (!nextEvent) return `${lunar.monthName}${lunar.dayName}`
      return nextEvent.days === 0 ? nextEvent.name : `${nextEvent.name}+${nextEvent.days}`
    }
    case 24:
      return getChineseYi(date)
    case 25:
      return getChineseJi(date)
    case 26:
      return getChineseShichen(date)
    case 27:
      return getChineseWeekday(date)
    case 28:
      return getChineseWeekday(date, true)
    case 33:
      return `${date.getFullYear()}年`
    case 34:
      return `${date.getMonth() + 1}月`
    case 35:
      return `${chineseNumber(date.getMonth() + 1)}月`
    case 36:
      return `${date.getDate()}日`
    case 37:
      return `${chineseNumber(date.getDate())}日`
    case 38:
      return `${date.getMonth() + 1}月${date.getDate()}日`
    case 39:
      return `${chineseNumber(date.getMonth() + 1)}月${chineseNumber(date.getDate())}日`
    case 40:
      return lunar.yearName
    case 41:
      return lunar.monthName
    case 42:
      return lunar.dayName
    case 43:
      return `农历${lunar.monthName}`
    case 44:
      return getSolarFestival(date)
    case 45:
      return getLunarFestival(date)
    case 46:
      return getSolarTerm(date)
    case 47:
      return getNextFestival(date)?.name || ''
    case 48: {
      const event = getNextFestival(date)
      return event ? (event.days === 0 ? event.name : `${event.name} ${event.days}天`) : ''
    }
    case 49:
      return getNextSolarTerm(date)?.name || ''
    case 50: {
      const event = getNextSolarTerm(date)
      return event ? (event.days === 0 ? event.name : `${event.name} ${event.days}天`) : ''
    }
    case 51:
      return lunar.zodiacYear.replace(/年$/, '')
    case 52:
      return SHICHEN_BRANCHES[Math.floor(((date.getHours() + 1) % 24) / 2)]
    case 53:
      return getFourPillars(date).year
    case 54:
      return getFourPillars(date).month
    case 55:
      return getFourPillars(date).day
    case 56:
      return getFourPillars(date).hour
    default:
      return ''
  }
}
