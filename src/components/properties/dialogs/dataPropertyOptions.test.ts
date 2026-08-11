import { describe, expect, it } from 'vitest'
import {
  createDefaultDataOptions,
  resolveDefaultDataOptionValue,
  resolveDataOptionsBySymbols,
  type DataPropertyOption
} from './dataPropertyOptions'

const option = (value: number, category: DataPropertyOption['category']): DataPropertyOption => ({
  value,
  valueCode: value,
  metricSymbol: category === 'field' ? `:FIELD_TYPE_${value}:` : `:${category.toUpperCase()}_${value}:`,
  category,
  settingsLabel: { eng: String(value), zhs: String(value) },
  label: String(value),
  dataLabel: { eng: String(value), zhs: String(value) },
  unitKey: 'none',
  iconUnicode: '0061',
  icon: '0061',
  defaultValue: '0',
  isActive: 1,
  sortOrder: value,
  dialMode: null,
  dialMin: null,
  dialMax: null,
  dialGoalSource: null
})

describe('data property default options', () => {
  const field = option(1, 'field')
  const weather = option(2, 'weather')

  it('keeps only FIELD_TYPE options as default value candidates', () => {
    expect(createDefaultDataOptions([weather, field])).toEqual([field])
  })

  it('keeps a valid FIELD_TYPE default value', () => {
    expect(resolveDefaultDataOptionValue([weather, field], field.value)).toBe(field.value)
  })

  it('falls back to the first FIELD_TYPE option for a legacy default value', () => {
    expect(resolveDefaultDataOptionValue([weather, field], weather.value)).toBe(field.value)
  })

  it('returns undefined when no FIELD_TYPE option exists', () => {
    expect(resolveDefaultDataOptionValue([weather], weather.value)).toBeUndefined()
  })

  it('resolves symbols in property order and prefers stored definitions', () => {
    const storedField = { ...field, settingsLabel: { eng: 'Stored', zhs: '旧值' } }

    const result = resolveDataOptionsBySymbols(
      [field, weather],
      { [field.metricSymbol]: storedField },
      [weather.metricSymbol, field.metricSymbol, weather.metricSymbol],
    )

    expect(result.map(item => item.metricSymbol)).toEqual([weather.metricSymbol, field.metricSymbol])
    expect(result[1].settingsLabel.eng).toBe('Stored')
    expect(result[1].value).toBe(field.metricSymbol)
  })
})
