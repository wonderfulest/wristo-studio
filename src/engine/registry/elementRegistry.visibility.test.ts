import { describe, expect, it } from 'vitest'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { decodeElementConfig, encodeElementByRegistry, registerElement } from './elementRegistry'

describe('element registry dynamic visibility', () => {
  it('round-trips visibility through the shared registry boundary', () => {
    const eleType = 'dynamic-visibility-test'
    registerElement(eleType, {
      add: () => ({}) as any,
      encode: (element) => ({
        id: String(element.id),
        eleType,
        left: 10,
        top: 20,
        originX: 'center',
        originY: 'center',
      }),
      decode: () => ({}),
    })
    const visibility = {
      mode: 'expression' as const,
      expression: parseExpression('(ds3) <= 20', DEFAULT_EXPRESSION_TOKEN_CATALOG),
      fallback: true,
    }

    const encoded = encodeElementByRegistry({
      id: 'battery-warning',
      eleType,
      left: 10,
      top: 20,
      displayStates: { active: true, ambient: false },
      visibility,
    } as any)
    const decoded = decodeElementConfig(encoded!)

    expect((encoded as any).visibility).toEqual(visibility)
    expect((decoded as any).visibility).toEqual(visibility)
  })
})
