import { DateFormatConstants } from '@/config/elements/options/dateFormats'
import { formatChineseCulturalDate, getChineseLunarDate } from '@/utils/chineseCalendar'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from './tokenCatalog'
import type { ExpressionTokenDefinition } from './types'

export const TOKEN_TEMPLATE_MAX_LENGTH = 128
export const TOKEN_TEMPLATE_MAX_TOKENS = 8

const TOKEN_PATTERN = /\(([a-zA-Z][a-zA-Z0-9_.]*)\)(?:\.format\("(%(?:0\d+)?(?:d|f|s))"\))?/g
const TOKEN_OPERAND_PATTERN = /^\(([a-zA-Z][a-zA-Z0-9_.]*)\)(?:\.format\("(%(?:0\d+)?(?:d|f|s))"\))?$/

const CHINESE_FORMATTERS: Record<string, number> = {
  'chinaCalendar.lunar.date': DateFormatConstants.LUNAR_DATE,
  'chinaCalendar.lunar.yearText': DateFormatConstants.LUNAR_YEAR,
  'chinaCalendar.lunar.monthText': DateFormatConstants.LUNAR_MONTH,
  'chinaCalendar.lunar.dayText': DateFormatConstants.LUNAR_DAY,
  'chinaCalendar.festival.today': DateFormatConstants.FESTIVAL_OR_SOLAR_TERM,
  'chinaCalendar.solarTerm.next': DateFormatConstants.NEXT_SOLAR_TERM,
  'chinaCalendar.ganzhi.year': DateFormatConstants.GANZHI_YEAR,
  'chinaCalendar.pillar.year': DateFormatConstants.FOUR_PILLAR_YEAR,
  'chinaCalendar.pillar.month': DateFormatConstants.FOUR_PILLAR_MONTH,
  'chinaCalendar.pillar.day': DateFormatConstants.FOUR_PILLAR_DAY,
  'chinaCalendar.pillar.hour': DateFormatConstants.FOUR_PILLAR_HOUR,
  'chinaCalendar.zodiac.name': DateFormatConstants.ZODIAC,
  'chinaCalendar.zodiac.year': DateFormatConstants.ZODIAC_YEAR,
  'chinaCalendar.shichen.branch': DateFormatConstants.SHICHEN_BRANCH,
  'chinaCalendar.shichen.name': DateFormatConstants.LUNAR_SHICHEN,
  'chinaCalendar.solar.yearText': DateFormatConstants.SOLAR_YEAR_LABEL,
  'chinaCalendar.solar.monthText': DateFormatConstants.SOLAR_MONTH_LABEL,
  'chinaCalendar.solar.monthZh': DateFormatConstants.SOLAR_MONTH_ZH,
  'chinaCalendar.solar.dayText': DateFormatConstants.SOLAR_DAY_LABEL,
  'chinaCalendar.solar.dayZh': DateFormatConstants.SOLAR_DAY_ZH,
  'chinaCalendar.solar.weekShort': DateFormatConstants.CHINESE_WEEKDAY_SHORT,
  'chinaCalendar.solar.weekLong': DateFormatConstants.CHINESE_WEEKDAY_LONG,
}

function tokenValue(definition: ExpressionTokenDefinition, date: Date): unknown {
  const lunar = getChineseLunarDate(date)
  switch (definition.id) {
    case 'time.year': return date.getFullYear()
    case 'time.shortYear': return date.getFullYear() % 100
    case 'time.month': return date.getMonth() + 1
    case 'time.dayOfMonth': return date.getDate()
    case 'time.dayOfWeek': return date.getDay() + 1
    case 'time.hour24': return date.getHours()
    case 'time.minute': return date.getMinutes()
    case 'time.second': return date.getSeconds()
    case 'chinaCalendar.lunar.year': return lunar?.year ?? null
    case 'chinaCalendar.lunar.month': return lunar?.month ?? null
    case 'chinaCalendar.lunar.day': return lunar?.day ?? null
    case 'chinaCalendar.lunar.leap': return lunar?.isLeapMonth ?? null
    case 'chinaCalendar.festival.gregorian.next':
      return formatChineseCulturalDate(date, DateFormatConstants.NEXT_GREGORIAN_FESTIVAL).replace(/\+\d+$/, '')
    case 'chinaCalendar.festival.gregorian.suffix':
      return formatChineseCulturalDate(date, DateFormatConstants.NEXT_GREGORIAN_FESTIVAL).match(/\+\d+$/)?.[0] ?? ''
    case 'chinaCalendar.solarTerm.next':
      return formatChineseCulturalDate(date, DateFormatConstants.NEXT_SOLAR_TERM).replace(/\+\d+$/, '')
    case 'chinaCalendar.solarTerm.suffix':
      return formatChineseCulturalDate(date, DateFormatConstants.NEXT_SOLAR_TERM).match(/\+\d+$/)?.[0] ?? ''
    default: {
      const formatter = CHINESE_FORMATTERS[definition.id]
      return formatter === undefined ? definition.exampleValue : formatChineseCulturalDate(date, formatter)
    }
  }
}

export function validateTokenTemplate(template: string): string[] {
  const source = String(template ?? '')
  const errors: string[] = []
  if (source.length > TOKEN_TEMPLATE_MAX_LENGTH) {
    errors.push(`Token template must not exceed ${TOKEN_TEMPLATE_MAX_LENGTH} characters.`)
  }
  const matches = [...source.matchAll(TOKEN_PATTERN)]
  if (matches.length > TOKEN_TEMPLATE_MAX_TOKENS) {
    errors.push(`Token template must not contain more than ${TOKEN_TEMPLATE_MAX_TOKENS} tokens.`)
  }
  for (const match of matches) {
    const definition = DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(match[1])
    if (!definition) errors.push(`Unknown token: ${match[1]}`)
    if (definition && match[2] && match[2] !== '%s' && definition.valueType !== 'number') {
      errors.push(`Format ${match[2]} requires a numeric token: ${match[1]}`)
    }
  }
  if (matches.length > 0 || source.includes('{{') || source.includes('}}')) {
    try {
      parseDynamicString(source)
    } catch {
      errors.push('Malformed dynamic string.')
    }
  }
  return errors
}

type DynamicStringPart = { type: 'literal'; value: string } | { type: 'token'; code: string; format?: string }

function parseDynamicString(source: string): DynamicStringPart[] {
  if (source.includes('{{') || source.includes('}}')) throw new Error('Legacy token syntax is not supported')
  const parts: string[] = []
  let start = 0
  let quoted = false
  let escaped = false
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (escaped) { escaped = false; continue }
    if (quoted && char === '\\') { escaped = true; continue }
    if (char === '"') { quoted = !quoted; continue }
    if (!quoted && char === '+') {
      parts.push(source.slice(start, index).trim())
      start = index + 1
    }
  }
  if (quoted) throw new Error('Unterminated string literal')
  parts.push(source.slice(start).trim())
  if (parts.some((part) => !part)) throw new Error('Missing dynamic string operand')
  return parts.map((part) => {
    if (part.startsWith('"') && part.endsWith('"')) {
      return { type: 'literal', value: JSON.parse(part) } as DynamicStringPart
    }
    const token = part.match(TOKEN_OPERAND_PATTERN)
    if (!token) throw new Error('Unsupported dynamic string operand')
    return { type: 'token', code: token[1], format: token[2] } as DynamicStringPart
  })
}

function applyFormat(value: unknown, format?: string): string {
  if (value == null) return ''
  if (!format || format === '%s') return String(value)
  const width = Number(format.match(/^%0(\d+)/)?.[1] || 0)
  if (format.endsWith('d')) {
    const result = String(Math.trunc(Number(value)))
    return width ? result.padStart(width, '0') : result
  }
  if (format.endsWith('f')) return String(Number(value))
  return String(value)
}

export function resolveTokenTemplate(
  template: string,
  date = new Date(),
  resolver?: (code: string, format?: string) => unknown,
): string {
  const source = String(template ?? '')
  if (![...source.matchAll(TOKEN_PATTERN)].length) return source
  try {
    return parseDynamicString(source).map((part) => {
      if (part.type === 'literal') return part.value
      const definition = DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(part.code)
      if (!definition) return ''
      const resolved = resolver?.(part.code, part.format)
      return applyFormat(resolved === undefined ? tokenValue(definition, date) : resolved, part.format)
    }).join('')
  } catch {
    return source
  }
}
