import { resolveTokenTemplate, validateTokenTemplate } from '@/engine/expression/textTemplateTokens'

export const DEFAULT_DATE_TEMPLATE = '(dt5.1) + "." + (dt3).format("%02d") + "." + (tm2).format("%02d")'

const RANDOM_DATE_PARTS = {
  month: ['(tm2)', '(dt2.1)', '(dt2.2)'],
  day: ['(dt3)', '(dt3).format("%02d")'],
  weekday: ['(dt5.1)', '(dt5.2)'],
} as const
const RANDOM_DATE_PART_ORDERS = [
  ['month', 'day', 'weekday'],
  ['month', 'weekday', 'day'],
  ['day', 'month', 'weekday'],
  ['day', 'weekday', 'month'],
  ['weekday', 'month', 'day'],
  ['weekday', 'day', 'month'],
] as const
const RANDOM_DATE_SEPARATORS = ['.', '/', '-', '·', ' '] as const

export function createRandomDateTemplate(
  currentTemplate = '',
  random: () => number = Math.random,
): string {
  const candidates: string[] = []
  for (const month of RANDOM_DATE_PARTS.month) {
    for (const day of RANDOM_DATE_PARTS.day) {
      for (const weekday of RANDOM_DATE_PARTS.weekday) {
        const parts = { month, day, weekday }
        for (const order of RANDOM_DATE_PART_ORDERS) {
          for (const separator of RANDOM_DATE_SEPARATORS) {
            candidates.push(order
              .map((part) => parts[part])
              .join(` + ${JSON.stringify(separator)} + `))
          }
        }
      }
    }
  }
  const available = candidates.filter((candidate) => candidate !== currentTemplate)
  const index = Math.min(
    available.length - 1,
    Math.max(0, Math.floor(random() * available.length)),
  )
  return available[index]
}

const DATE_TOKEN_PATTERN = /\(([a-zA-Z][a-zA-Z0-9_.]*)\)/g
const DATE_TOKENS = new Set(['dt1', 'dt1.1', 'tm2', 'dt2.1', 'dt2.2', 'dt3', 'dt4', 'dt5', 'dt5.1', 'dt5.2', 'dt6'])

function isoWeek(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function validateCustomDateTemplate(template: string): string[] {
  const errors = validateTokenTemplate(template)
  for (const match of String(template ?? '').matchAll(DATE_TOKEN_PATTERN)) {
    const code = match[1]
    if (!DATE_TOKENS.has(code) && !code.startsWith('cn')) {
      errors.push(`Date templates only support date and calendar tokens: ${code}`)
    }
  }
  return [...new Set(errors)]
}

export function formatCustomDateTemplate(template: string, date: Date, locale: string): string {
  return resolveTokenTemplate(template, date, (code) => {
    switch (code) {
      case 'dt1': return date.getFullYear()
      case 'dt1.1': return date.getFullYear() % 100
      case 'tm2': return date.getMonth() + 1
      case 'dt2.1': return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)
      case 'dt2.2': return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
      case 'dt3': return date.getDate()
      case 'dt4': return isoWeek(date)
      case 'dt5': return date.getDay() + 1
      case 'dt5.1': return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)
      case 'dt5.2': return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
      case 'dt6': return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000)
      default: return undefined
    }
  })
}
