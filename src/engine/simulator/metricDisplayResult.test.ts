import { describe, expect, it } from 'vitest'
import type { DataTypeOption, ValidatedDataCatalog } from '@/types/dataCatalog'
import { resolveMetricDisplayResult } from './metricDisplayResult'

const metric = {
  valueCode: 7,
  metricSymbol: ':FIELD_TYPE_DISTANCE',
  unitKey: 'distance',
} as DataTypeOption

const unit = {
  unitKey: 'distance',
  name: 'Distance',
  defaultVariant: 'km',
  selectionPolicy: {
    type: 'deviceSetting', setting: 'distanceUnits',
    mapping: { metric: 'km', statute: 'mi' },
  },
  variants: {
    km: { aliases: ['km'], label: { eng: 'km', zhs: '公里' } },
    mi: { aliases: ['mi'], label: { eng: 'mi', zhs: '英里' } },
  },
  isActive: 1,
  sortOrder: 1,
  description: null,
}

const catalog = { unitsByKey: new Map([['distance', unit]]) } as unknown as ValidatedDataCatalog

describe('metric display result', () => {
  it('converts the value and unit variant from one preview context', () => {
    expect(resolveMetricDisplayResult(metric, {
      rawValue: 5,
      displayValue: '5.0',
      providerUnit: 'km',
    }, {
      language: 'eng', distanceUnits: 'statute', temperatureUnits: 'metric',
    }, catalog)).toEqual({
      rawValue: 5,
      displayValue: '3.1',
      unitKey: 'distance',
      variantKey: 'mi',
      unitLabel: 'mi',
    })
  })

  it.each([
    [
      { valueCode: 57, metricSymbol: ':FIELD_TYPE_TEMPERATURE', unitKey: 'temperature' },
      {
        unitKey: 'temperature',
        defaultVariant: 'celsius',
        selectionPolicy: {
          type: 'deviceSetting', setting: 'temperatureUnits',
          mapping: { metric: 'celsius', statute: 'fahrenheit' },
        },
        variants: {
          celsius: { aliases: ['c', '°c'], label: { eng: '°C', zhs: '摄氏度' } },
          fahrenheit: { aliases: ['f', '°f'], label: { eng: '°F', zhs: '华氏度' } },
        },
      },
      { rawValue: 20, displayValue: '20', providerUnit: '°C' },
      { language: 'eng', distanceUnits: 'metric', temperatureUnits: 'statute' },
      '68°',
    ],
    [
      { valueCode: 9, metricSymbol: ':FIELD_TYPE_BATTERY', unitKey: 'percentage' },
      {
        unitKey: 'percentage',
        defaultVariant: 'percent',
        selectionPolicy: { type: 'fixed', variant: 'percent' },
        variants: { percent: { aliases: ['%'], label: { eng: '%', zhs: '百分比' } } },
      },
      { rawValue: 82, displayValue: '82', providerUnit: '%' },
      { language: 'zhs', distanceUnits: 'metric', temperatureUnits: 'metric' },
      '82%',
    ],
  ] as const)('puts fixed inline units in the data value and leaves the unit empty', (metricValue, unitValue, source, context, expectedDisplay) => {
    const inlineCatalog = {
      unitsByKey: new Map([[unitValue.unitKey, unitValue]]),
    } as unknown as ValidatedDataCatalog

    expect(resolveMetricDisplayResult(metricValue as DataTypeOption, source, context, inlineCatalog)).toMatchObject({
      displayValue: expectedDisplay,
      unitLabel: '',
    })
  })

  it('converts both temperature range endpoints before adding one degree suffix', () => {
    const temperatureMetric = {
      valueCode: 61,
      metricSymbol: ':FIELD_TYPE_TEMPERATURE_RANGE',
      unitKey: 'temperature',
    } as DataTypeOption
    const temperatureUnit = {
      unitKey: 'temperature',
      defaultVariant: 'celsius',
      selectionPolicy: {
        type: 'deviceSetting', setting: 'temperatureUnits',
        mapping: { metric: 'celsius', statute: 'fahrenheit' },
      },
      variants: {
        celsius: { aliases: ['c', '°c'], label: { eng: '°C', zhs: '摄氏度' } },
        fahrenheit: { aliases: ['f', '°f'], label: { eng: '°F', zhs: '华氏度' } },
      },
    }
    const temperatureCatalog = {
      unitsByKey: new Map([['temperature', temperatureUnit]]),
    } as unknown as ValidatedDataCatalog

    expect(resolveMetricDisplayResult(temperatureMetric, {
      rawValue: [20, 30],
      displayValue: '20/30',
      providerUnit: '°C',
    }, {
      language: 'eng', distanceUnits: 'metric', temperatureUnits: 'statute',
    }, temperatureCatalog)).toMatchObject({
      displayValue: '68/86°',
      unitLabel: '',
    })
  })
})
