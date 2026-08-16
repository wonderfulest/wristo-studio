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
vi.mock('@/engine/managers/elementManager', () => ({
  updateElementById: async (id: string, patch: Record<string, unknown>) => {
    const element = activeObjects.find((item) => String(item.id) === id)
    if (element) Object.assign(element, patch)
  },
}))
vi.mock('@/stores/properties', () => ({ usePropertiesStore: () => ({ allProperties: {}, addProperty, getMetricByOptions, registerDataOptions }) }))
vi.mock('@/stores/historyStore', () => ({ useHistoryStore: () => ({ saveState }) }))
vi.mock('@/stores/dataCatalogStore', () => {
  const canonical = {
    value: 1,
    valueCode: 1,
    metricSymbol: ':FIELD_TYPE_STEPS',
    category: 'field',
    unitKey: 'distance',
    label: { eng: 'DIST', zhs: '距离' },
    defaultValue: '8.5',
  }
  const distance = {
    unitKey: 'distance',
    defaultVariant: 'km',
    selectionPolicy: { type: 'fixed', variant: 'km' },
    variants: { km: { aliases: ['km'], label: { eng: 'km', zhs: '公里' } } },
  }
  return {
    getDataTypePropertyOptions: () => [canonical],
    useDataCatalogStore: () => ({
      options: [canonical],
      snapshot: {
        optionsByValueCode: new Map([[1, canonical]]),
        optionsByMetricSymbol: new Map([[canonical.metricSymbol, canonical]]),
        unitsByKey: new Map([['distance', distance]]),
        aliasOwners: new Map(),
      },
    }),
  }
})
vi.mock('@/stores/designStore', () => ({ useDesignStore: () => ({ appLanguage: 'zhs' }) }))

import { bindMetricPropertyToSelection, canBindMetricPropertyToSelection, createQuickMetricProperty, isMetricBindableElement } from './propertyBinding'

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

  it('applies the Chinese unit label when binding a metric in a Chinese application', async () => {
    const unit = { id: 'unit-1', eleType: 'unit', text: '' }
    activeObjects.splice(0, activeObjects.length, unit)
    getMetricByOptions.mockReturnValue({ metricSymbol: ':FIELD_TYPE_STEPS' })

    await bindMetricPropertyToSelection('data_1', 'data')

    expect(unit.text).toBe('公里')
  })
})
// @vitest-environment jsdom
