import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { useExpressionPreviewStore } from './expressionPreviewStore'
import { useLayerStore } from './layerStore'

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

describe('expression preview visibility', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with catalog example values', () => {
    expect(useExpressionPreviewStore().tokenValues['system.battery.level']).toBe(76)
  })

  it('recomputes layer visibility when a preview token changes', () => {
    const previewStore = useExpressionPreviewStore()
    const layerStore = useLayerStore()
    const set = vi.fn()
    layerStore.addLayer({
      id: 'warning',
      eleType: 'text',
      displayStates: { active: true, ambient: true },
      visibility: {
        mode: 'expression',
        expression: parseExpression('(ds3) <= 20', DEFAULT_EXPRESSION_TOKEN_CATALOG),
        fallback: true,
      },
      set,
    } as any)

    previewStore.setTokenValue('system.battery.level', 15)

    expect(layerStore.layers[0].visible).toBe(true)
    expect(set).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
  })
})
