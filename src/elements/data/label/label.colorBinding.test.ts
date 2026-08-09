import { readFileSync } from 'node:fs'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { decodeLabel, encodeLabel } from './label.encoder'
import { getDataTypePropertyOptions, useDataCatalogStore, validateDataCatalog } from '@/stores/dataCatalogStore'
import { usePropertiesStore } from '@/stores/properties'

vi.hoisted(() => {
  const storage = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() {
      return storage.size
    },
    },
  })
})

describe('label color property binding', () => {
  it('round-trips fillProperty through encode and decode', () => {
    setActivePinia(createPinia())
    const catalog = validateDataCatalog({
      catalogVersion: 1,
      dataTypeOptions: [{ valueCode: 0, metricSymbol: ':FIELD_TYPE_HEART_RATE', category: 'field', settingsLabel: { eng: 'Heart Rate', zhs: '心率' }, label: { eng: 'HR', zhs: '心率' }, unitKey: 'none', iconUnicode: '0061', defaultValue: '0', isActive: 1, sortOrder: 1, dialMode: null, dialMin: null, dialMax: null, dialGoalSource: null }],
      unitDefinitions: [{ unitKey: 'none', name: 'None', defaultVariant: null, variants: {}, isActive: 1, sortOrder: 1, description: null }],
    })
    useDataCatalogStore().snapshot = catalog
    usePropertiesStore().addProperty({ key: 'data_1', type: 'data', title: 'Data 1', options: getDataTypePropertyOptions(), defaultValue: 0 })
    const encoded = encodeLabel({
      id: 'label-1',
      eleType: 'label',
      left: 10,
      top: 20,
      originX: 'center',
      originY: 'center',
      fill: '#FFAA00',
      fillProperty: 'accentColor',
      fontSize: 24,
      fontFamily: 'roboto-condensed-regular',
      dataProperty: 'data_1',
      text: 'Label',
    } as any)

    expect(encoded.fillProperty).toBe('accentColor')
    expect(decodeLabel(encoded).fillProperty).toBe('accentColor')
  })

  it('rejects an unknown metric symbol instead of rendering the catalog first label', () => {
    setActivePinia(createPinia())
    const catalog = validateDataCatalog({
      catalogVersion: 1,
      dataTypeOptions: [{ valueCode: 0, metricSymbol: ':FIELD_TYPE_HEART_RATE', category: 'field', settingsLabel: { eng: 'Heart Rate', zhs: '心率' }, label: { eng: 'HR', zhs: '心率' }, unitKey: 'none', iconUnicode: '0061', defaultValue: '0', isActive: 1, sortOrder: 1, dialMode: null, dialMin: null, dialMax: null, dialGoalSource: null }],
      unitDefinitions: [{ unitKey: 'none', name: 'None', defaultVariant: null, variants: {}, isActive: 1, sortOrder: 1, description: null }],
    })
    useDataCatalogStore().snapshot = catalog

    expect(() => decodeLabel({ id: 'unknown', eleType: 'label', metricSymbol: ':FIELD_TYPE_UNKNOWN' } as any))
      .toThrow('data type option :FIELD_TYPE_UNKNOWN: canonical definition is missing')
  })

  it('uses the property-change event in the panel', () => {
    const source = readFileSync(new URL('./label.panel.vue', import.meta.url), 'utf8')

    expect(source).toContain(':property-key="currentModel.fillProperty"')
    expect(source).toContain('@property-change="handleColorSelection"')
    expect(source).toContain('fillProperty: selection.propertyKey')
  })

  it('propagates fillProperty through every renderer boundary', () => {
    const source = readFileSync(new URL('./label.renderer.ts', import.meta.url), 'utf8')

    expect(source).toContain('fillProperty: config.fillProperty')
    expect(source).toContain('(element as any).fillProperty ?? config.fillProperty')
    expect(source).toContain('fillProperty: patch.fillProperty')
    expect(source).toContain('fillProperty: (text as any).fillProperty')
  })
})
