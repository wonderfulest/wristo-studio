import { describe, expect, it } from 'vitest'
import type { DataTypePropertyOption } from '@/stores/dataCatalogStore'
import { resolveQuickAddDataFieldOptions } from '@/components/properties/dialogs/dataPropertyOptions'

const option = (
  metricSymbol: string,
  category: DataTypePropertyOption['category'],
  systemDefault: 0 | 1,
): DataTypePropertyOption => ({
  value: metricSymbol.length,
  valueCode: metricSymbol.length,
  metricSymbol,
  category,
  settingsLabel: { eng: metricSymbol, zhs: metricSymbol },
  label: metricSymbol,
  dataLabel: { eng: { short: 'Data', medium: 'Metric', long: 'Data Label' }, zhs: metricSymbol },
  unitKey: 'none',
  iconUnicode: '0061',
  icon: '0061',
  defaultValue: '0',
  isActive: 1,
  systemDefault,
  sortOrder: 1,
  dialMode: null,
  dialMin: null,
  dialMax: null,
  dialGoalSource: null,
})

describe('AppMenu data property creation contract', () => {
  it('uses only enabled system field options for a quick-added property', () => {
    const heartRate = option(':FIELD_TYPE_HEART_RATE', 'field', 1)
    const customField = option(':FIELD_TYPE_CUSTOM', 'field', 0)
    const goal = option(':GOAL_TYPE_STEPS', 'goal', 1)

    const result = resolveQuickAddDataFieldOptions(
      [customField, goal, heartRate],
      heartRate.metricSymbol,
    )

    expect(result.options.map((item) => item.metricSymbol)).toEqual([
      ':FIELD_TYPE_HEART_RATE',
    ])
    expect(result.defaultOption.metricSymbol).toBe(':FIELD_TYPE_HEART_RATE')
  })
})
