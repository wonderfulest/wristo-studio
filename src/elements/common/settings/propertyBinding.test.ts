import { describe, expect, it, vi } from 'vitest'

const { activeObjects, getMetricByOptions } = vi.hoisted(() => ({
  activeObjects: [] as any[],
  getMetricByOptions: vi.fn(),
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ activeIds: [], canvas: { getObjects: () => [], getActiveObjects: () => activeObjects } }),
}))
vi.mock('@/stores/properties', () => ({ usePropertiesStore: () => ({ allProperties: {}, getMetricByOptions }) }))

import { canBindMetricPropertyToSelection, isMetricBindableElement } from './propertyBinding'

describe('metric property binding support', () => {
  it('checks element structure without resolving a metric property', () => {
    expect(isMetricBindableElement('data', 'label')).toBe(true)
    expect(isMetricBindableElement('goal', 'goalBar')).toBe(true)
    expect(isMetricBindableElement('data', 'goalBar')).toBe(false)
    expect(isMetricBindableElement('goal', 'weather')).toBe(false)
  })

  it('canBind performs only a structural check and never resolves an empty property key', () => {
    activeObjects.splice(0, activeObjects.length, { eleType: 'label' })
    expect(canBindMetricPropertyToSelection('data')).toBe(true)
    expect(getMetricByOptions).not.toHaveBeenCalled()

    activeObjects.splice(0, activeObjects.length, { eleType: 'weather' })
    expect(canBindMetricPropertyToSelection('data')).toBe(false)
    expect(getMetricByOptions).not.toHaveBeenCalled()
  })
})
// @vitest-environment jsdom
