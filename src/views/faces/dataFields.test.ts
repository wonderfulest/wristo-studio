import { describe, expect, it } from 'vitest'
import { supportedDataFields } from './dataFields'

describe('published supported data fields', () => {
  it('reads serialized catalogs, uses full names and deduplicates property options', () => {
    expect(supportedDataFields(JSON.stringify({
      dataOptions: { ':FIELD_TYPE_STEPS': { label: { eng: { short: 'Stp', long: 'Daily Steps' } } } },
      properties: { data_1: { type: 'data', value: ':FIELD_TYPE_STEPS', metricSymbols: [':FIELD_TYPE_STEPS', ':FIELD_TYPE_HEART_RATE'] } },
    }))).toEqual([
      { symbol: ':FIELD_TYPE_STEPS', label: 'Daily Steps' },
      { symbol: ':FIELD_TYPE_HEART_RATE', label: 'Heart rate' },
    ])
  })
  it('ignores disabled fields, goal options, and unrelated settings', () => {
    expect(supportedDataFields({
      dataOptions: { ':FIELD_TYPE_STEPS': { isActive: 0 }, ':GOAL_TYPE_STEPS': { label: 'Steps Goal' } },
      properties: { data: { type: 'data', value: ':FIELD_TYPE_STEPS' }, color: { type: 'color', value: 'white' } },
    })).toEqual([])
  })
  it('handles missing, malformed and empty configuration', () => {
    for (const value of [null, undefined, '', '{bad', [], {}, { dataOptions: null, properties: [] }]) {
      expect(supportedDataFields(value)).toEqual([])
    }
  })
})
