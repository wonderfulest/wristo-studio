import { describe, expect, it } from 'vitest'
import type { ValidatedDataCatalog } from '@/types/dataCatalog'
import { requireCanonicalMetric, resolveMetricLabel, resolveMetricUnit } from './metricLabel'

const unitsByKey = new Map()
const aliasOwners = new Map()
const catalog = {
  catalogVersion: 1,
  dataTypeOptions: [{
    valueCode: 7,
    metricSymbol: ':FIELD_TYPE_DISTANCE',
    category: 'field',
    settingsLabel: { eng: 'Distance', zhs: '距离' },
    label: { eng: 'DIST', zhs: '距离' },
    unitKey: 'distance',
    iconUnicode: 'f001',
    defaultValue: '5.0',
    isActive: 1,
    sortOrder: 1,
    dialMode: null,
    dialMin: null,
    dialMax: null,
    dialGoalSource: null,
  }],
  unitDefinitions: [{
    unitKey: 'distance',
    name: 'Distance',
    defaultVariant: 'km',
    variants: {
      km: { aliases: ['km'], label: { eng: 'km', zhs: '公里' } },
      mi: { aliases: ['mi', 'mile'], label: { eng: 'mi', zhs: '英里' } },
    },
    isActive: 1,
    sortOrder: 1,
    description: null,
  }, {
    unitKey: 'temperature',
    name: 'Temperature',
    defaultVariant: 'celsius',
    variants: {
      celsius: { aliases: ['c'], label: { eng: '°C', zhs: '℃' } },
    },
    isActive: 1,
    sortOrder: 2,
    description: null,
  }],
} as unknown as ValidatedDataCatalog
for (const unit of catalog.unitDefinitions) {
  unitsByKey.set(unit.unitKey, unit)
  for (const [variantKey, variant] of Object.entries(unit.variants)) {
    for (const alias of variant.aliases) aliasOwners.set(alias, { unitKey: unit.unitKey, variantKey })
  }
}
;(catalog as any).unitsByKey = unitsByKey
;(catalog as any).aliasOwners = aliasOwners

const option = catalog.dataTypeOptions[0]

describe('canonical metric label and unit resolvers', () => {
  it('reads watchface labels only from canonical label', () => {
    expect(resolveMetricLabel(option, 'zh')).toBe('距离')
    expect(resolveMetricLabel(option, 'en')).toBe('DIST')
  })

  it('resolves normalized runtime aliases through the catalog owner', () => {
    expect(resolveMetricUnit(option, 'zh', catalog, ' MILE ')).toBe('英里')
    expect(resolveMetricUnit(option, 'en', catalog, 'mi')).toBe('mi')
  })

  it('uses the referenced unit default when no runtime alias exists', () => {
    expect(resolveMetricUnit(option, 'zh', catalog)).toBe('公里')
  })

  it('rejects an unknown runtime alias with the exact unit error', () => {
    expect(() => resolveMetricUnit(option, 'zh', catalog, 'yard')).toThrow(
      'unitKey distance: unknown runtime unit alias "yard"',
    )
  })

  it('rejects a globally owned alias that belongs to another unit', () => {
    expect(() => resolveMetricUnit(option, 'zh', catalog, 'c')).toThrow(
      'unitKey distance: unknown runtime unit alias "c"',
    )
  })

  it('reports a missing referenced unit definition exactly', () => {
    expect(() => resolveMetricUnit({ ...option, unitKey: 'missing' }, 'en', catalog)).toThrow(
      'unitKey missing: definition is missing',
    )
  })

  it('finds canonical metrics by value code or symbol without reading legacy labels', () => {
    expect(requireCanonicalMetric({ value: 7, label: 'legacy' }, catalog)).toBe(option)
    expect(requireCanonicalMetric({ metricSymbol: ':FIELD_TYPE_DISTANCE' }, catalog)).toBe(option)
    expect(() => requireCanonicalMetric({ value: 8 }, catalog)).toThrow('data type option 8: canonical definition is missing')
    expect(() => requireCanonicalMetric({ value: 8, metricSymbol: ':FIELD_TYPE_DISTANCE' }, catalog)).toThrow(
      'data type option 8: canonical definition is missing',
    )
  })

  it('validates a provided value before considering a valid symbol', () => {
    expect(() => requireCanonicalMetric({ value: 'bad', metricSymbol: ':FIELD_TYPE_DISTANCE' }, catalog)).toThrow(
      'data type option valueCode "bad": must be a finite integer',
    )
    expect(() => requireCanonicalMetric({ value: 7.5, metricSymbol: ':FIELD_TYPE_DISTANCE' }, catalog)).toThrow(
      'data type option valueCode "7.5": must be a finite integer',
    )
    expect(() => requireCanonicalMetric({ value: Number.NaN, metricSymbol: ':FIELD_TYPE_DISTANCE' }, catalog)).toThrow(
      'data type option valueCode "NaN": must be a finite integer',
    )
    expect(() => requireCanonicalMetric({ value: '   ', metricSymbol: ':FIELD_TYPE_DISTANCE' }, catalog)).toThrow(
      'data type option valueCode "   ": must be a finite integer',
    )
  })

  it('accepts trimmed strict decimal integer strings as legacy value codes', () => {
    expect(requireCanonicalMetric({ value: ' 7 ', metricSymbol: ':FIELD_TYPE_DISTANCE' }, catalog)).toBe(option)
    expect(() => requireCanonicalMetric({ value: '7.0', metricSymbol: ':FIELD_TYPE_DISTANCE' }, catalog)).toThrow(
      'data type option valueCode "7.0": must be a finite integer',
    )
  })
})
