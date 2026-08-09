// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePropertiesStore } from './properties'
import { useDataCatalogStore, validateDataCatalog } from './dataCatalogStore'

describe('Dial Properties', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns only properties matching the requested Dial mode', () => {
    const store = usePropertiesStore()
    store.addProperty({ key: 'dial_goal_1', type: 'dial', dialMode: 'goal', title: 'Steps', options: [] })
    store.addProperty({ key: 'dial_range_1', type: 'dial', dialMode: 'range', title: 'Battery', options: [] })

    expect(store.getDialProperties('goal').map(([key]) => key)).toEqual(['dial_goal_1'])
    expect(store.getDialProperties('range').map(([key]) => key)).toEqual(['dial_range_1'])
  })

  it('does not change the mode of an existing Dial Property', () => {
    const store = usePropertiesStore()
    store.addProperty({ key: 'dial_goal_1', type: 'dial', dialMode: 'goal', title: 'Steps', options: [] })

    store.editProperty('dial_goal_1', { dialMode: 'range' })

    expect(store.allProperties.dial_goal_1.dialMode).toBe('goal')
  })

  it('clears blank-design properties and defaults text case to uppercase', () => {
    const store = usePropertiesStore()
    store.addProperty({ key: 'color_1', type: 'color', title: 'Color', defaultValue: '0xFFFFFF', options: [] })
    store.textCase = 2

    store.clearProperties()

    expect(store.allProperties).toEqual({})
    expect(store.textCase).toBe(1)
  })

  it('returns undefined for an unknown metric instead of the catalog first item', () => {
    const catalog = validateDataCatalog({
      catalogVersion: 1,
      dataTypeOptions: [{ valueCode: 0, metricSymbol: ':FIELD_TYPE_HEART_RATE', category: 'field', settingsLabel: { eng: 'Heart Rate', zhs: '心率' }, label: { eng: 'HR', zhs: '心率' }, unitKey: 'none', iconUnicode: '0061', defaultValue: '0', isActive: 1, sortOrder: 1, dialMode: null, dialMin: null, dialMax: null, dialGoalSource: null }],
      unitDefinitions: [{ unitKey: 'none', name: 'None', defaultVariant: null, variants: {}, isActive: 1, sortOrder: 1, description: null }],
    })
    useDataCatalogStore().snapshot = catalog

    expect(usePropertiesStore().getMetricByOptions({ metricSymbol: ':FIELD_TYPE_UNKNOWN' })).toBeUndefined()
  })
})
