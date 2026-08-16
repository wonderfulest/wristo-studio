import { describe, expect, it } from 'vitest'
import { parseExpression } from './parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from './tokenCatalog'
import { validateVisibilityExpression } from './validation'

describe('validateVisibilityExpression', () => {
  it('accepts a canonical boolean visibility expression', () => {
    const visibility = {
      mode: 'expression',
      expression: parseExpression('(ds3) <= 20', DEFAULT_EXPRESSION_TOKEN_CATALOG),
      fallback: true,
    }

    expect(validateVisibilityExpression(visibility)).toEqual([])
  })

  it('rejects source and AST that describe different rules', () => {
    const expression = parseExpression('(ds3) <= 20', DEFAULT_EXPRESSION_TOKEN_CATALOG)
    const visibility = {
      mode: 'expression',
      expression: { ...expression, source: '(ds3) <= 10' },
      fallback: true,
    }

    expect(validateVisibilityExpression(visibility)).toContain('Visibility source and AST do not match')
  })

  it('accepts an equivalent AST whose object keys were reordered by serialization', () => {
    const visibility = {
      mode: 'expression',
      expression: {
        source: '(ds3) <= 20',
        ast: {
          right: { value: 20, valueType: 'number', type: 'literal' },
          left: { code: 'ds3', tokenId: 'system.battery.level', type: 'token' },
          operator: '<=',
          type: 'binary',
        },
        resultType: 'boolean',
        version: 1,
      },
      fallback: true,
    }

    expect(validateVisibilityExpression(visibility)).toEqual([])
  })

  it('rejects a missing boolean fallback', () => {
    const visibility = {
      mode: 'expression',
      expression: parseExpression('(ds3) <= 20', DEFAULT_EXPRESSION_TOKEN_CATALOG),
    }

    expect(validateVisibilityExpression(visibility)).toContain('Visibility fallback must be boolean')
  })

  it('reports unsupported tokens from imported JSON', () => {
    const expression = parseExpression('(ds3) <= 20', DEFAULT_EXPRESSION_TOKEN_CATALOG)
    const visibility = {
      mode: 'expression',
      expression: { ...expression, source: '(ds999) <= 20' },
      fallback: true,
    }

    expect(validateVisibilityExpression(visibility)).toContain('Unknown token: (ds999)')
  })
})
