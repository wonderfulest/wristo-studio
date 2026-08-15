import { describe, expect, it } from 'vitest'
import { createVisibilityExpression } from './visibilityExpressionModel'

describe('createVisibilityExpression', () => {
  it('creates a typed visibility expression from WFB-style source', () => {
    const visibility = createVisibilityExpression('(ds3) <= 20', false)

    expect(visibility.mode).toBe('expression')
    expect(visibility.expression.resultType).toBe('boolean')
    expect(visibility.fallback).toBe(false)
  })

  it('rejects expressions that do not return boolean', () => {
    expect(() => createVisibilityExpression('(ds3) + 10', true)).toThrow(
      'Expected boolean expression, received number',
    )
  })
})
