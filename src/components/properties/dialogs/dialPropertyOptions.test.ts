import { describe, expect, it } from 'vitest'
import {
  createAddableDialOptions,
  createDefaultDialOptions,
  resolveDialOptionSymbols,
  resolveDialOptionsBySymbols,
} from './dialPropertyOptions'

const catalog = [
  { value: 1, valueCode: 1, metricSymbol: ':GOAL_TYPE_STEPS', dialMode: 'goal', isActive: 1, systemDefault: 1, sortOrder: 1 },
  { value: 2, valueCode: 2, metricSymbol: ':FIELD_TYPE_BATTERY', dialMode: 'range', isActive: 1, systemDefault: 1, sortOrder: 2 },
  { value: 3, valueCode: 3, metricSymbol: ':FIELD_TYPE_STRESS', dialMode: 'range', isActive: 1, systemDefault: 0, sortOrder: 3 },
  { value: 4, valueCode: 4, metricSymbol: ':FIELD_TYPE_WEATHER_WIND_DIRECTION', dialMode: 'direction', isActive: 1, systemDefault: 0, sortOrder: 4 },
] as any[]

describe('dial property options', () => {
  it('derives ordered symbols from legacy saved options', () => {
    expect(resolveDialOptionSymbols(undefined, [catalog[2], catalog[1]])).toEqual([
      ':FIELD_TYPE_STRESS',
      ':FIELD_TYPE_BATTERY',
    ])
  })

  it('resolves only same-mode options in saved order', () => {
    expect(resolveDialOptionsBySymbols(
      catalog,
      [catalog[1], catalog[2]],
      [':FIELD_TYPE_STRESS', ':GOAL_TYPE_STEPS', ':FIELD_TYPE_BATTERY'],
      'range',
    ).map((option) => option.metricSymbol)).toEqual([
      ':FIELD_TYPE_STRESS',
      ':FIELD_TYPE_BATTERY',
    ])
  })

  it('creates mode defaults and excludes current options from addable options', () => {
    expect(createDefaultDialOptions(catalog, 'range').map((option) => option.metricSymbol))
      .toEqual([':FIELD_TYPE_BATTERY'])
    expect(createDefaultDialOptions(catalog, 'direction').map((option) => option.metricSymbol))
      .toEqual([':FIELD_TYPE_WEATHER_WIND_DIRECTION'])
    expect(createAddableDialOptions(catalog, [catalog[1]], 'range').map((option) => option.metricSymbol))
      .toEqual([':FIELD_TYPE_STRESS'])
  })
})
