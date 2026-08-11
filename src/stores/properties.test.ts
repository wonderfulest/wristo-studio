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

  it('preserves Simplified Chinese property and option labels', () => {
    const store = usePropertiesStore()
    store.addProperty({
      key: 'color_1',
      type: 'color',
      title: 'Accent Color',
      titleCn: '强调色',
      defaultValue: '0xFF0000',
      options: [{ label: 'Red', labelCn: '红色', value: '0xFF0000' }],
    })

    expect(store.allProperties.color_1.titleCn).toBe('强调色')
    expect(store.allProperties.color_1.options?.[0].labelCn).toBe('红色')
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
      unitDefinitions: [{ unitKey: 'none', name: 'None', defaultVariant: null, selectionPolicy: { type: 'none' }, variants: {}, isActive: 1, sortOrder: 1, description: null }],
    })
    useDataCatalogStore().snapshot = catalog

    expect(usePropertiesStore().getMetricByOptions({ metricSymbol: ':FIELD_TYPE_UNKNOWN' })).toBeUndefined()
  })

  it('resolves a data property through its metricSymbols and top-level snapshot', () => {
    const catalog = validateDataCatalog({
      catalogVersion: 1,
      dataTypeOptions: [{ valueCode: 1, metricSymbol: ':FIELD_TYPE_STEPS', category: 'field', settingsLabel: { eng: 'Catalog Steps', zhs: '步数' }, label: { eng: 'STEPS', zhs: '步数' }, unitKey: 'none', iconUnicode: '0061', defaultValue: '0', isActive: 1, sortOrder: 1, dialMode: null, dialMin: null, dialMax: null, dialGoalSource: null }],
      unitDefinitions: [{ unitKey: 'none', name: 'None', defaultVariant: null, selectionPolicy: { type: 'none' }, variants: {}, isActive: 1, sortOrder: 1, description: null }],
    })
    useDataCatalogStore().snapshot = catalog
    const store = usePropertiesStore()
    store.loadDataPropertyConfig({
      data_1: {
        type: 'data', title: 'Primary', metricSymbols: [':FIELD_TYPE_STEPS'], value: ':FIELD_TYPE_STEPS',
      },
    } as any, {
      ':FIELD_TYPE_STEPS': { ...catalog.dataTypeOptions[0], settingsLabel: { eng: 'Stored Steps', zhs: '旧步数' } },
    })

    expect(store.resolveDataPropertyOptions('data_1').map(option => option.metricSymbol)).toEqual([':FIELD_TYPE_STEPS'])
    expect(store.resolveSelectedDataOption('data_1')?.settingsLabel.eng).toBe('Stored Steps')
    expect(store.getMetricByOptions({ dataProperty: 'data_1' })?.metricSymbol).toBe(':FIELD_TYPE_STEPS')
  })

  it('clears top-level data options with the properties', () => {
    const store = usePropertiesStore()
    store.dataOptions = { ':FIELD_TYPE_STEPS': {} as any }

    store.clearProperties()

    expect(store.dataOptions).toEqual({})
  })

  it('prunes top-level definitions after deleting the last referencing property', () => {
    const store = usePropertiesStore()
    store.loadDataPropertyConfig({
      data_1: { type: 'data', title: 'One', metricSymbols: [':SHARED', ':ONLY_ONE'], value: ':SHARED' },
      data_2: { type: 'data', title: 'Two', metricSymbols: [':SHARED'], value: ':SHARED' },
    } as any, {
      ':SHARED': { metricSymbol: ':SHARED' } as any,
      ':ONLY_ONE': { metricSymbol: ':ONLY_ONE' } as any,
    })

    store.deleteProperty('data_1')

    expect(Object.keys(store.dataOptions)).toEqual([':SHARED'])
  })
})
