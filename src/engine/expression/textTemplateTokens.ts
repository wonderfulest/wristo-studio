import { DateFormatConstants } from '@/config/elements/options/dateFormats'
import { formatChineseCulturalDate, getChineseLunarDate } from '@/utils/chineseCalendar'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from './tokenCatalog'
import { parseExpression } from './parser'
import type { ExpressionNode, ExpressionTokenDefinition } from './types'

export const TOKEN_TEMPLATE_MAX_LENGTH = 128
export const TOKEN_TEMPLATE_MAX_TOKENS = 8

const TOKEN_PATTERN = /\(([a-zA-Z][a-zA-Z0-9_.]*)\)/g
const NUMBER_FORMAT_SOURCE = '%(?:,)?(?:0)?(?:\\d+)?(?:\\.\\d+)?[dfs]'
const TOKEN_OPERAND_PATTERN = new RegExp(`^\\(([a-zA-Z][a-zA-Z0-9_.]*)\\)(?:\\.format\\("(${NUMBER_FORMAT_SOURCE})"\\))?$`)
const FORMATTED_EXPRESSION_PATTERN = new RegExp(`^(.+)\\.format\\("(${NUMBER_FORMAT_SOURCE})"\\)$`)

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

function dateIsoWeek(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function tokenValue(definition: ExpressionTokenDefinition, date: Date): unknown {
  const lunar = getChineseLunarDate(date)
  switch (definition.id) {
    case 'date.year': return date.getFullYear()
    case 'date.shortYear': return date.getFullYear() % 100
    case 'date.month': return date.getMonth() + 1
    case 'date.monthShort': return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date)
    case 'date.monthLong': return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date)
    case 'date.dayOfMonth': return date.getDate()
    case 'date.isoWeek': return dateIsoWeek(date)
    case 'date.dayOfWeek': return date.getDay() + 1
    case 'date.weekdayShort': return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)
    case 'date.weekdayLong': return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)
    case 'date.dayOfYear': return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000)
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
  }
  if (matches.length > 0 || source.includes('{{') || source.includes('}}')) {
    try {
      parseDynamicString(source)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Malformed dynamic string'
      errors.push(`${message}.`)
      if (!message.includes('Malformed dynamic string')) errors.push('Malformed dynamic string.')
    }
  }
  return errors
}

type DynamicStringPart =
  | { type: 'literal'; value: string }
  | { type: 'token'; code: string; format?: string }
  | { type: 'numeric'; ast: ExpressionNode; format: string }

function parseDynamicString(source: string): DynamicStringPart[] {
  if (source.includes('{{') || source.includes('}}')) throw new Error('Legacy token syntax is not supported')
  const parts: string[] = []
  let start = 0
  let quoted = false
  let escaped = false
  let depth = 0
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (escaped) { escaped = false; continue }
    if (quoted && char === '\\') { escaped = true; continue }
    if (char === '"') { quoted = !quoted; continue }
    if (!quoted && char === '(') { depth += 1; continue }
    if (!quoted && char === ')') { depth -= 1; if (depth < 0) throw new Error('Unbalanced parentheses'); continue }
    if (!quoted && char === '+' && depth === 0) {
      parts.push(source.slice(start, index).trim())
      start = index + 1
    }
  }
  if (quoted || depth !== 0) throw new Error('Malformed dynamic string')
  parts.push(source.slice(start).trim())
  if (parts.some((part) => !part)) throw new Error('Missing dynamic string operand')
  return parts.map((part) => {
    if (part.startsWith('"') && part.endsWith('"')) {
      return { type: 'literal', value: JSON.parse(part) } as DynamicStringPart
    }
    const token = part.match(TOKEN_OPERAND_PATTERN)
    if (token) {
      const definition = DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(token[1])
      if (!definition) throw new Error(`Unknown token: ${token[1]}`)
      if (token[2] && token[2] !== '%s' && definition.valueType !== 'number') {
        throw new Error(`Format ${token[2]} requires a numeric token: ${token[1]}`)
      }
      return { type: 'token', code: token[1], format: token[2] } as DynamicStringPart
    }
    const numeric = part.match(FORMATTED_EXPRESSION_PATTERN)
    if (!numeric) throw new Error('Unsupported dynamic string operand')
    const expression = parseExpression(numeric[1], DEFAULT_EXPRESSION_TOKEN_CATALOG)
    if (expression.resultType !== 'number') throw new Error('Formatted arithmetic expression must be numeric')
    return { type: 'numeric', ast: expression.ast, format: numeric[2] } as DynamicStringPart
  })
}

function groupThousands(value: string): string {
  const sign = value.startsWith('-') || value.startsWith('+') ? value[0] : ''
  const unsigned = sign ? value.slice(1) : value
  const [integer, fraction] = unsigned.split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${grouped}${fraction === undefined ? '' : `.${fraction}`}`
}

function padFormattedNumber(value: string, width: number, zeroPad: boolean): string {
  if (!width || value.length >= width) return value
  const padding = (zeroPad ? '0' : ' ').repeat(width - value.length)
  if (zeroPad && (value.startsWith('-') || value.startsWith('+'))) return `${value[0]}${padding}${value.slice(1)}`
  return `${padding}${value}`
}

function applyFormat(value: unknown, format?: string): string {
  if (value == null) return ''
  if (!format || format === '%s') return String(value)
  const match = format.match(/^%(,)?(0)?(\d+)?(?:\.(\d+))?([df])$/)
  if (!match) return ''
  const [, grouped, zero, widthSource, precisionSource, type] = match
  const number = Number(value)
  if (!Number.isFinite(number)) return ''
  let result = type === 'd'
    ? String(Math.trunc(number))
    : precisionSource === undefined ? String(number) : number.toFixed(Number(precisionSource))
  if (grouped) result = groupThousands(result)
  return padFormattedNumber(result, Number(widthSource || 0), Boolean(zero))
}

function evaluateNumeric(node: ExpressionNode, resolve: (code: string) => unknown): number | null {
  if (node.type === 'literal') return node.valueType === 'number' ? Number(node.value) : null
  if (node.type === 'token') {
    const value = resolve(node.code)
    return value == null || !Number.isFinite(Number(value)) ? null : Number(value)
  }
  if (node.type !== 'binary' || !['+', '-', '*', '/', '%'].includes(node.operator)) return null
  const left = evaluateNumeric(node.left, resolve)
  const right = evaluateNumeric(node.right, resolve)
  if (left == null || right == null || ((node.operator === '/' || node.operator === '%') && right === 0)) return null
  switch (node.operator) {
    case '+': return left + right
    case '-': return left - right
    case '*': return left * right
    case '/': return left / right
    case '%': return left % right
  }
  return null
}

export function resolveTokenTemplate(
  template: string,
  date = new Date(),
  resolver?: (code: string, format?: string, usage?: 'display' | 'numeric') => unknown,
): string {
  const source = String(template ?? '')
  if (![...source.matchAll(TOKEN_PATTERN)].length) return source
  try {
    let invalidNumeric = false
    const result = parseDynamicString(source).map((part) => {
      if (part.type === 'literal') return part.value
      if (part.type === 'numeric') {
        const value = evaluateNumeric(part.ast, (code) => {
          const resolved = resolver?.(code, undefined, 'numeric')
          const definition = DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(code)
          return resolved === undefined && definition ? tokenValue(definition, date) : resolved
        })
        if (value == null) { invalidNumeric = true; return '' }
        return applyFormat(value, part.format)
      }
      const definition = DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(part.code)
      if (!definition) return ''
      const resolved = resolver?.(part.code, part.format, 'display')
      return applyFormat(resolved === undefined ? tokenValue(definition, date) : resolved, part.format)
    }).join('')
    return invalidNumeric ? '' : result
  } catch {
    return source
  }
}
