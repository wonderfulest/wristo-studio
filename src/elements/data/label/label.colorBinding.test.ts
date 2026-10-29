// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { decodeLabel, encodeLabel } from './label.encoder'
import { getDataTypePropertyOptions, useDataCatalogStore, validateDataCatalog } from '@/stores/dataCatalogStore'
import { usePropertiesStore } from '@/stores/properties'

describe('label color property binding', () => {
  it('round-trips fillProperty through encode and decode', () => {
    setActivePinia(createPinia())
    const catalog = validateDataCatalog({
      catalogVersion: 1,
      dataTypeOptions: [{ valueCode: 0, metricSymbol: ':FIELD_TYPE_HEART_RATE', category: 'field', settingsLabel: { eng: 'Heart Rate', zhs: '心率' }, label: { eng: { short: 'HR', medium: 'Heart', long: 'Heart Rate' }, zhs: '心率' }, unitKey: 'none', iconUnicode: '0061', defaultValue: '0', isActive: 1, sortOrder: 1, dialMode: null, dialMin: null, dialMax: null, dialGoalSource: null }],
      unitDefinitions: [{ unitKey: 'none', name: 'None', defaultVariant: null, selectionPolicy: { type: 'none' }, variants: {}, isActive: 1, sortOrder: 1, description: null }],
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
      dataTypeOptions: [{ valueCode: 0, metricSymbol: ':FIELD_TYPE_HEART_RATE', category: 'field', settingsLabel: { eng: 'Heart Rate', zhs: '心率' }, label: { eng: { short: 'HR', medium: 'Heart', long: 'Heart Rate' }, zhs: '心率' }, unitKey: 'none', iconUnicode: '0061', defaultValue: '0', isActive: 1, sortOrder: 1, dialMode: null, dialMin: null, dialMax: null, dialGoalSource: null }],
      unitDefinitions: [{ unitKey: 'none', name: 'None', defaultVariant: null, selectionPolicy: { type: 'none' }, variants: {}, isActive: 1, sortOrder: 1, description: null }],
    })
    useDataCatalogStore().snapshot = catalog

    expect(() => decodeLabel({ id: 'unknown', eleType: 'label', metricSymbol: ':FIELD_TYPE_UNKNOWN' } as any))
      .toThrow('data type option :FIELD_TYPE_UNKNOWN: canonical definition is missing')
  })

  it('uses the property-change event in the panel', () => {
    const source = readFileSync(resolve(__dirname, './label.panel.vue'), 'utf8')

    expect(source).toContain(':property-key="currentModel.fillProperty"')
    expect(source).toContain('@property-change="handleColorSelection"')
    expect(source).toContain('fillProperty: selection.propertyKey')
  })

  it('propagates fillProperty through every renderer boundary', () => {
    const source = readFileSync(resolve(__dirname, './label.renderer.ts'), 'utf8')

    expect(source).toContain('fillProperty: config.fillProperty')
    expect(source).toContain('(element as any).fillProperty ?? config.fillProperty')
    expect(source).toContain('fillProperty: patch.fillProperty')
    expect(source).toContain('fillProperty: (text as any).fillProperty')
  })
})
