import { describe, expect, it, vi } from 'vitest'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { applySharedElementPatch } from './elementManager'

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(), key: vi.fn(), length: 0 },
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(), key: vi.fn(), length: 0 },
  })
})

describe('applySharedElementPatch', () => {
  it('applies dynamic visibility independently of the element renderer', () => {
    const element = { visibility: { mode: 'literal', value: true } }
    const visibility = {
      mode: 'expression' as const,
      expression: parseExpression('(ds3) <= 20', DEFAULT_EXPRESSION_TOKEN_CATALOG),
      fallback: false,
    }

    applySharedElementPatch(element as any, { visibility } as any)

    expect(element.visibility).toEqual(visibility)
  })

  it('rebuilds a stale visibility AST from its editable source', () => {
    const element: Record<string, unknown> = {}
    const staleExpression = parseExpression('(w01) == 1', DEFAULT_EXPRESSION_TOKEN_CATALOG)

    applySharedElementPatch(element, {
      visibility: {
        mode: 'expression',
        expression: { ...staleExpression, source: '(w01) == 10' },
        fallback: false,
      },
    } as any)

    expect(element.visibility).toEqual({
      mode: 'expression',
      expression: parseExpression('(w01) == 10', DEFAULT_EXPRESSION_TOKEN_CATALOG),
      fallback: false,
    })
  })
})
