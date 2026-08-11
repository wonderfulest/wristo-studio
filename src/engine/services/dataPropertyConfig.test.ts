import { describe, expect, it } from 'vitest'
import type { DataTypeOption } from '@/types/dataCatalog'
import {
  normalizeDataPropertyConfig,
  serializeDataPropertyConfig,
} from './dataPropertyConfig'

const option = (valueCode: number, metricSymbol: string, category: DataTypeOption['category'] = 'field'): DataTypeOption => ({
  valueCode,
  metricSymbol,
  category,
  settingsLabel: { eng: metricSymbol, zhs: metricSymbol },
  label: { eng: metricSymbol, zhs: metricSymbol },
  unitKey: 'none',
  iconUnicode: '0061',
  defaultValue: '0',
  isActive: 1,
  sortOrder: valueCode,
  dialMode: null,
  dialMin: null,
  dialMax: null,
  dialGoalSource: null,
})

const steps = option(1, ':FIELD_TYPE_STEPS')
const battery = option(2, ':FIELD_TYPE_BATTERY')
const weather = option(57, ':WEATHER_TEMPERATURE', 'weather')
const catalog = [steps, battery, weather]

describe('normalizeDataPropertyConfig', () => {
  it('migrates legacy options into symbol references and a deduplicated top-level map', () => {
    const config = {
      properties: {
        data_1: {
          type: 'data',
          title: 'Primary',
          value: 1,
          options: [
            { ...steps, value: 1, label: { eng: 'Stored Steps', zhs: '旧步数' } },
            { ...weather, value: 57 },
          ],
        },
        data_2: {
          type: 'data',
          title: 'Secondary',
          value: 2,
          options: [
            { metricSymbol: weather.metricSymbol, value: 57 },
            { ...battery, value: 2 },
          ],
        },
      },
    }

    const result = normalizeDataPropertyConfig(config, catalog)

    expect(result.issues).toEqual([])
    expect(result.properties.data_1).toMatchObject({
      metricSymbols: [steps.metricSymbol, weather.metricSymbol],
      value: steps.metricSymbol,
    })
    expect(result.properties.data_1).not.toHaveProperty('options')
    expect(result.properties.data_2).toMatchObject({
      metricSymbols: [weather.metricSymbol, battery.metricSymbol],
      value: battery.metricSymbol,
    })
    expect(Object.keys(result.dataOptions)).toEqual([
      steps.metricSymbol,
      weather.metricSymbol,
      battery.metricSymbol,
    ])
    expect(result.dataOptions[steps.metricSymbol].label.eng).toBe('Stored Steps')
    expect(result.dataOptions[weather.metricSymbol].unitKey).toBe('none')
  })

  it('keeps unknown symbols visible as issues instead of dropping them', () => {
    const result = normalizeDataPropertyConfig({
      properties: {
        data_1: {
          type: 'data',
          title: 'Unknown',
          metricSymbols: [':FIELD_TYPE_UNKNOWN'],
          value: ':FIELD_TYPE_UNKNOWN',
        },
      },
      dataOptions: {},
    }, catalog)

    expect(result.properties.data_1.metricSymbols).toEqual([':FIELD_TYPE_UNKNOWN'])
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'unknown_symbol',
      propertyKey: 'data_1',
      metricSymbol: ':FIELD_TYPE_UNKNOWN',
    }))
  })
})

describe('serializeDataPropertyConfig', () => {
  it('rejects a selected value outside the property symbols', () => {
    const result = serializeDataPropertyConfig({
      data_1: {
        type: 'data',
        title: 'Primary',
        metricSymbols: [steps.metricSymbol],
        value: battery.metricSymbol,
      },
    } as any, {
      [steps.metricSymbol]: steps,
      [battery.metricSymbol]: battery,
    }, catalog)

    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'invalid_value',
      propertyKey: 'data_1',
    }))
  })

  it('removes unreferenced top-level definitions and preserves first-use order', () => {
    const result = serializeDataPropertyConfig({
      data_1: {
        type: 'data',
        title: 'Primary',
        metricSymbols: [weather.metricSymbol, steps.metricSymbol],
        value: weather.metricSymbol,
      },
    } as any, {
      [battery.metricSymbol]: battery,
      [steps.metricSymbol]: steps,
      [weather.metricSymbol]: weather,
    }, catalog)

    expect(result.issues).toEqual([])
    expect(Object.keys(result.dataOptions)).toEqual([weather.metricSymbol, steps.metricSymbol])
    expect(result.properties.data_1).not.toHaveProperty('options')
  })
})
