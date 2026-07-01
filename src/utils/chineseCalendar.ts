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
const WEEKDAYS_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEKDAYS_LONG = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const EN_ZODIACS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig']
const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SOLAR_TERMS: Record<string, string> = {
  '01-05': '小寒', '01-20': '大寒', '02-04': '立春', '02-19': '雨水',
  '03-06': '惊蛰', '03-21': '春分', '04-05': '清明', '04-20': '谷雨',
  '05-06': '立夏', '05-21': '小满', '06-06': '芒种', '06-21': '夏至',
  '07-07': '小暑', '07-23': '大暑', '08-08': '立秋', '08-23': '处暑',
  '09-08': '白露', '09-23': '秋分', '10-08': '寒露', '10-23': '霜降',
  '11-07': '立冬', '11-22': '小雪', '12-07': '大雪', '12-22': '冬至',
}
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

interface LunarDate {
  year: number
  month: number
  day: number
  isLeapMonth: boolean
  monthName: string
  dayName: string
  ganzhiYear: string
  zodiacYear: string
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

export function getChineseLunarDate(date: Date): LunarDate {
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
    monthName: `${isLeapMonth ? '闰' : ''}${MONTHS[lunarMonth - 1]}`,
    dayName: lunarDayName(lunarDay),
    ganzhiYear: ganzhiYear(lunarYear),
    zodiacYear: zodiacYear(lunarYear),
  }
}

export function getChineseFestival(date: Date) {
  const solarKey = key(date.getMonth() + 1, date.getDate())
  if (SOLAR_FESTIVALS[solarKey]) return SOLAR_FESTIVALS[solarKey]
  if (SOLAR_TERMS[solarKey]) return SOLAR_TERMS[solarKey]
  const lunar = getChineseLunarDate(date)
  return LUNAR_FESTIVALS[key(lunar.month, lunar.day)] || ''
}

export function getEnglishFestivalOrSolarTerm(date: Date) {
  const solarKey = key(date.getMonth() + 1, date.getDate())
  if (EN_SOLAR_FESTIVALS[solarKey]) return EN_SOLAR_FESTIVALS[solarKey]
  if (EN_SOLAR_TERMS[solarKey]) return EN_SOLAR_TERMS[solarKey]
  const lunar = getChineseLunarDate(date)
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
    case 23:
      return getChineseFestival(date) || `${lunar.monthName}${lunar.dayName}`
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
    default:
      return ''
  }
}
