import { describe, expect, it } from 'vitest'

import type { DataTypeOption } from '@/types/dataCatalog'
import {
  getConnectIqEligibleDataTypes,
  getConnectIqSelectedDataTypeValues,
  selectAllConnectIqDataTypes,
  clearAllConnectIqDataTypes,
} from './connectIqDataTypeSelection'

const option = (valueCode: number, category: DataTypeOption['category']): DataTypeOption => ({
  valueCode,
  category,
  metricSymbol: `:FIELD_TYPE_${valueCode}:`,
  settingsLabel: { eng: `English ${valueCode}`, zhs: `Chinese ${valueCode}` },
  label: { eng: { short: 'Data', medium: 'Metric', long: 'Data Label' }, zhs: `标签 ${valueCode}` },
  unitKey: 'none',
  iconUnicode: '',
  defaultValue: '',
  isActive: 1,
  sortOrder: valueCode,
  dialMode: null,
  dialMin: null,
  dialMax: null,
  dialGoalSource: null,
})

describe('Connect IQ data type selection domain', () => {
  const options = [
    option(1, 'field'), option(2, 'indicator'), option(3, 'date'), option(4, 'weather'),
    option(5, 'goal'), option(6, 'chart'),
  ]

  it('derives eligible active canonical options in catalog order', () => {
    expect(getConnectIqEligibleDataTypes(options).map(({ valueCode }) => valueCode)).toEqual([1, 2, 4])
  })

  it('defaults newly active eligible options to selected while preserving stale exclusions', () => {
    expect(getConnectIqSelectedDataTypeValues(options, [2, 999])).toEqual([1, 4])
    expect(getConnectIqSelectedDataTypeValues([...options, option(7, 'field')], [2, 999])).toEqual([1, 4, 7])
  })

  it('select all removes only eligible exclusions and preserves stale values', () => {
    expect(selectAllConnectIqDataTypes(options, [1, 2, 999])).toEqual([999])
  })

  it('clear all adds all eligible exclusions and preserves stale values', () => {
    expect(clearAllConnectIqDataTypes(options, [2, 999])).toEqual([1, 2, 4, 999])
  })
})
