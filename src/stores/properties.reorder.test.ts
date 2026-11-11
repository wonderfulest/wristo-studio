// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePropertiesStore } from './properties'

describe('property group ordering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    usePropertiesStore().loadProperties({
      data_1: { type: 'data', title: 'First', value: ':STEPS', metricSymbols: [':STEPS'] },
      color_1: { type: 'color', title: 'Color', value: '0xFFFFFF' },
      data_2: { type: 'data', title: 'Second', value: ':HR' },
      data_3: { type: 'data', title: 'Third', value: ':BATTERY' },
    })
  })

  it('reorders only the specified group while retaining keys, values, and other group positions', () => {
    const store = usePropertiesStore()
    const first = store.allProperties.data_1
    expect(store.reorderProperties('data', ['data_3', 'data_1', 'data_2'])).toBe(true)
    expect(Object.keys(store.allProperties)).toEqual(['data_3', 'color_1', 'data_1', 'data_2'])
    expect(store.allProperties.data_1).toBe(first)
    expect(store.allProperties.data_1.metricSymbols).toEqual([':STEPS'])
  })

  it('retains ordering across JSON save/load and later property edits', () => {
    const store = usePropertiesStore()
    store.reorderProperties('data', ['data_2', 'data_3', 'data_1'])
    const saved = JSON.stringify(store.allProperties)
    store.clearProperties()
    store.loadDataPropertyConfig(JSON.parse(saved))
    store.addProperty({ key: 'data_2', type: 'data', title: 'Updated', defaultValue: ':HR' })
    expect(Object.keys(store.allProperties)).toEqual(['data_2', 'color_1', 'data_3', 'data_1'])
  })

  it.each(['loadProperties', 'loadDataPropertyConfig'] as const)('restores explicit order after server key normalization via %s', (load) => {
    const store = usePropertiesStore()
    store.reorderProperties('data', ['data_3', 'data_1', 'data_2'])
    store.addProperty({ key: 'data_3', type: 'data', title: 'Edited', defaultValue: ':BATTERY' })
    store.addProperty({ key: 'data_4', type: 'data', title: 'New', defaultValue: ':STEPS' })
    const expected = Object.keys(store.allProperties)
    const saved = JSON.parse(JSON.stringify(store.allProperties))
    const normalized = Object.fromEntries(Object.entries(saved).sort(([a], [b]) => a.localeCompare(b)))
    store.clearProperties()
    store[load](normalized as any)
    expect(Object.keys(store.allProperties)).toEqual(expected)
    expect(store.allProperties.data_3.title).toBe('Edited')
  })

  it.each([
    ['data_1', 'data_2', 'data_3'],
    ['data_1', 'data_2'],
    ['data_1', 'data_1', 'data_3'],
    ['data_1', 'color_1', 'data_3'],
    ['data_1', 'missing', 'data_3'],
  ])('ignores unchanged, stale, duplicate, and cross-type orders: %j', (...keys) => {
    const store = usePropertiesStore()
    const before = store.allProperties
    expect(store.reorderProperties('data', keys)).toBe(false)
    expect(store.allProperties).toBe(before)
  })
})
