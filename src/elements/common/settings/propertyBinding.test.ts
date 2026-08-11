import { describe, expect, it, vi } from 'vitest'

const { activeObjects, addProperty, getMetricByOptions, registerDataOptions, saveState } = vi.hoisted(() => ({
  activeObjects: [] as any[],
  addProperty: vi.fn(),
  getMetricByOptions: vi.fn(),
  registerDataOptions: vi.fn(),
  saveState: vi.fn(),
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ activeIds: [], canvas: { getObjects: () => [], getActiveObjects: () => activeObjects } }),
}))
vi.mock('@/stores/properties', () => ({ usePropertiesStore: () => ({ allProperties: {}, addProperty, getMetricByOptions, registerDataOptions }) }))
vi.mock('@/stores/historyStore', () => ({ useHistoryStore: () => ({ saveState }) }))
vi.mock('@/stores/dataCatalogStore', () => {
  const canonical = {
    value: 1,
    valueCode: 1,
    metricSymbol: ':FIELD_TYPE_STEPS',
    category: 'field',
    unitKey: 'none',
  }
  return {
    getDataTypePropertyOptions: () => [canonical],
    useDataCatalogStore: () => ({ options: [canonical] }),
  }
})

import { canBindMetricPropertyToSelection, createQuickMetricProperty, isMetricBindableElement } from './propertyBinding'

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

  it('creates data properties as symbol references and registers definitions once', () => {
    createQuickMetricProperty('data')

    expect(addProperty).toHaveBeenCalledWith(expect.objectContaining({
      type: 'data',
      metricSymbols: [':FIELD_TYPE_STEPS'],
      defaultValue: ':FIELD_TYPE_STEPS',
    }))
    expect(addProperty.mock.calls[0][0]).not.toHaveProperty('options')
    expect(registerDataOptions).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ metricSymbol: ':FIELD_TYPE_STEPS' }),
    ]))
  })
})
// @vitest-environment jsdom
