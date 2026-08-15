export type ExpressionLexeme =
  | { type: 'token'; value: string }
  | { type: 'number'; value: string }
  | { type: 'string'; value: string }
  | { type: 'color'; value: string }
  | { type: 'identifier'; value: string }
  | { type: 'operator'; value: string }
  | { type: 'punctuation'; value: '(' | ')' | ',' | '?' | ':' }
  | { type: 'eof'; value: '' }

const TOKEN_PATTERN = /^\(([a-zA-Z][a-zA-Z0-9_.]*)\)/
const NUMBER_PATTERN = /^\d+(?:\.\d+)?/
const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*/
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}/

export function lexExpression(source: string): ExpressionLexeme[] {
  const lexemes: ExpressionLexeme[] = []
  let offset = 0
  while (offset < source.length) {
    const remaining = source.slice(offset)
    const whitespace = remaining.match(/^\s+/)?.[0]
    if (whitespace) {
      offset += whitespace.length
      continue
    }
    const token = remaining.match(TOKEN_PATTERN)
    if (token) {
      lexemes.push({ type: 'token', value: token[1] })
      offset += token[0].length
      continue
    }
    const color = remaining.match(COLOR_PATTERN)?.[0]
    if (color) {
      lexemes.push({ type: 'color', value: color.toUpperCase() })
      offset += color.length
      continue
    }
    const number = remaining.match(NUMBER_PATTERN)?.[0]
    if (number) {
      lexemes.push({ type: 'number', value: number })
      offset += number.length
      continue
    }
    if (remaining[0] === '"') {
      let end = 1
      while (end < remaining.length && remaining[end] !== '"') end += remaining[end] === '\\' ? 2 : 1
      if (end >= remaining.length) throw new Error('Unterminated string literal')
      const raw = remaining.slice(0, end + 1)
      lexemes.push({ type: 'string', value: JSON.parse(raw) })
      offset += raw.length
      continue
    }
    const operator = ['&&', '||', '<=', '>=', '==', '!=', '+', '-', '*', '/', '%', '<', '>', '!']
      .find((candidate) => remaining.startsWith(candidate))
    if (operator) {
      lexemes.push({ type: 'operator', value: operator })
      offset += operator.length
      continue
    }
    const punctuation = remaining[0]
    if (['(', ')', ',', '?', ':'].includes(punctuation)) {
      lexemes.push({ type: 'punctuation', value: punctuation as '(' | ')' | ',' | '?' | ':' })
      offset += 1
      continue
    }
    const identifier = remaining.match(IDENTIFIER_PATTERN)?.[0]
    if (identifier) {
      lexemes.push({ type: 'identifier', value: identifier })
      offset += identifier.length
      continue
    }
    throw new Error(`Unexpected character at ${offset}: ${remaining[0]}`)
  }
  lexemes.push({ type: 'eof', value: '' })
  return lexemes
}
