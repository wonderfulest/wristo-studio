import type { ExpressionTokenCatalog } from './tokenCatalog'
import { lexExpression, type ExpressionLexeme } from './lexer'
import { inferExpressionType } from './typeChecker'
import type { ExpressionNode, TypedExpression } from './types'

const PRECEDENCE: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  '<': 4,
  '<=': 4,
  '>': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
}

class ExpressionParser {
  private index = 0

  constructor(
    private readonly lexemes: ExpressionLexeme[],
    private readonly catalog: ExpressionTokenCatalog,
  ) {}

  parse(): ExpressionNode {
    const expression = this.parseConditional()
    if (this.peek().type !== 'eof') throw new Error(`Unexpected token: ${this.peek().value}`)
    return expression
  }

  private peek(): ExpressionLexeme {
    return this.lexemes[this.index]
  }

  private consume(): ExpressionLexeme {
    return this.lexemes[this.index++]
  }

  private expectPunctuation(value: ')' | ',' | ':'): void {
    const lexeme = this.consume()
    if (lexeme.type !== 'punctuation' || lexeme.value !== value) {
      throw new Error(`Expected ${value}`)
    }
  }

  private parseConditional(): ExpressionNode {
    const condition = this.parseBinary(1)
    if (this.peek().type !== 'punctuation' || this.peek().value !== '?') return condition
    this.consume()
    const whenTrue = this.parseConditional()
    this.expectPunctuation(':')
    const whenFalse = this.parseConditional()
    return { type: 'conditional', condition, whenTrue, whenFalse }
  }

  private parseBinary(minimumPrecedence: number): ExpressionNode {
    let left = this.parseUnary()
    while (this.peek().type === 'operator') {
      const operator = this.peek().value
      const precedence = PRECEDENCE[operator]
      if (precedence === undefined || precedence < minimumPrecedence) break
      this.consume()
      const right = this.parseBinary(precedence + 1)
      left = {
        type: 'binary',
        operator: operator as Extract<ExpressionNode, { type: 'binary' }>['operator'],
        left,
        right,
      }
    }
    return left
  }

  private parseUnary(): ExpressionNode {
    if (this.peek().type === 'operator' && this.peek().value === '!') {
      this.consume()
      return { type: 'unary', operator: '!', operand: this.parseUnary() }
    }
    if (this.peek().type === 'operator' && this.peek().value === '-') {
      this.consume()
      return {
        type: 'binary',
        operator: '-',
        left: { type: 'literal', valueType: 'number', value: 0 },
        right: this.parseUnary(),
      }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): ExpressionNode {
    const lexeme = this.consume()
    if (lexeme.type === 'token') {
      const definition = this.catalog.getByCode(lexeme.value)
      if (!definition) throw new Error(`Unknown token: (${lexeme.value})`)
      return { type: 'token', tokenId: definition.id, code: definition.code }
    }
    if (lexeme.type === 'number') {
      return { type: 'literal', valueType: 'number', value: Number(lexeme.value) }
    }
    if (lexeme.type === 'string') return { type: 'literal', valueType: 'string', value: lexeme.value }
    if (lexeme.type === 'color') return { type: 'literal', valueType: 'color', value: lexeme.value }
    if (lexeme.type === 'identifier') {
      if (lexeme.value === 'true' || lexeme.value === 'false') {
        return { type: 'literal', valueType: 'boolean', value: lexeme.value === 'true' }
      }
      if (lexeme.value === 'null') return { type: 'literal', valueType: 'null', value: null }
      return this.parseCall(lexeme.value)
    }
    if (lexeme.type === 'punctuation' && lexeme.value === '(') {
      const grouped = this.parseConditional()
      this.expectPunctuation(')')
      return grouped
    }
    throw new Error(`Expected expression, received ${lexeme.value || 'end of input'}`)
  }

  private parseCall(name: string): ExpressionNode {
    const opening = this.consume()
    if (opening.type !== 'punctuation' || opening.value !== '(') {
      throw new Error(`Unknown identifier: ${name}`)
    }
    if (!['isnull', 'coalesce', 'min', 'max', 'round'].includes(name)) {
      throw new Error(`Unknown function: ${name}`)
    }
    const args: ExpressionNode[] = []
    if (this.peek().type !== 'punctuation' || this.peek().value !== ')') {
      do {
        args.push(this.parseConditional())
        if (this.peek().type !== 'punctuation' || this.peek().value !== ',') break
        this.consume()
      } while (true)
    }
    this.expectPunctuation(')')
    return { type: 'call', name: name as Extract<ExpressionNode, { type: 'call' }>['name'], arguments: args }
  }
}

export function parseExpression(source: string, catalog: ExpressionTokenCatalog): TypedExpression {
  const ast = new ExpressionParser(lexExpression(source), catalog).parse()
  return {
    source,
    ast,
    resultType: inferExpressionType(ast, catalog),
    version: 1,
  }
}
