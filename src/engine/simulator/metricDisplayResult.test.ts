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
})
