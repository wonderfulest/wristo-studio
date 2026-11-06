import { describe, expect, it } from 'vitest'
import { resolveElementVisibility } from '@/engine/expression/visibility'
import { createVisibilityExpression } from './visibilityExpressionModel'

describe('createVisibilityExpression', () => {
  it('creates a typed visibility expression from WFB-style source', () => {
    const visibility = createVisibilityExpression('(ds3) <= 20', false)

    expect(visibility.mode).toBe('expression')
    expect(visibility.expression.resultType).toBe('boolean')
    expect(visibility.fallback).toBe(false)
  })

  it('shows a blinking colon on even seconds and hides it on odd seconds', () => {
    const visibility = createVisibilityExpression('(tm9) % 2 == 0', true)
    for (let second = 0; second < 60; second++) {
      expect(resolveElementVisibility({
        visibility,
        previewMode: 'active',
        tokenValues: { 'time.second': second },
      })).toBe(second % 2 === 0)
    }
  })

  it('rejects expressions that do not return boolean', () => {
    expect(() => createVisibilityExpression('(ds3) + 10', true)).toThrow(
      'Expected boolean expression, received number',
    )
  })
})
