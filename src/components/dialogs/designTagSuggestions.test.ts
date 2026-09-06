import { describe, expect, it } from 'vitest'
import { designTagKeywords } from './designTagSuggestions'
import { suggestProductTags } from './goLiveTags'

describe('design tag suggestions', () => {
  it('uses selected bindings instead of stale metrics or unused choices', () => {
    const keywords = designTagKeywords({
      elements: [{ type: 'data', dataProperty: 'data_1', metricSymbol: ':FIELD_TYPE_HEART_RATE' }],
      properties: {
        data_1: { value: ':FIELD_TYPE_STEPS', metricSymbols: [':FIELD_TYPE_HEART_RATE'] },
        unused: { value: ':FIELD_TYPE_BATTERY' }
      }
    })
    expect(keywords).toBe('steps')
  })
  it('recognizes mixed time, date, weather, goals and bound metrics', () => {
    const keywords = designTagKeywords({
      elements: [{ eleType: 'time' }, { eleType: 'hourHand' }, { type: 'date' }, { type: 'weather' },
        { type: 'goalArc', goalProperty: 'goal_1' }],
      properties: { goal_1: { value: ':FIELD_TYPE_BODY_BATTERY' } }
    })
    expect(keywords.split(', ')).toEqual(['digital', 'analog', 'calendar', 'weather', 'activity goals', 'body battery', 'hybrid'])
  })
  it('handles missing configs and unbound properties without invented features', () => {
    expect(designTagKeywords(null)).toBe('')
    expect(designTagKeywords({ elements: [null, { type: 'image' }, { type: 'data', dataProperty: 'missing' }] })).toBe('')
  })
  it('matches enabled dictionary tags from features even with a generated design name', () => {
    const tags = ['digital', 'heart-rate', 'battery'].map((slug, i) => ({
      id: i + 1, name: slug, slug, tagGroup: 'function', sort: 0, status: i === 2 ? 0 : 1
    }))
    expect(suggestProductTags('App BNLYRC', tags, { elements: [
      { eleType: 'time' }, { type: 'data', metricSymbol: ':FIELD_TYPE_HEART_RATE' }, { type: 'battery' }
    ] })).toEqual([1, 2])
  })
})

it('does not infer device battery from body battery', () => {
  const tags = ['battery', 'body-battery'].map((slug, i) => ({ id: i + 1, name: slug, slug, tagGroup: 'function', sort: 0, status: 1 }))
  expect(suggestProductTags('', tags, { elements: [{ type: 'data', metricSymbol: ':FIELD_TYPE_BODY_BATTERY' }] })).toEqual([2])
})

it('resolves selected goal options and legacy numeric data snapshots', () => {
  expect(designTagKeywords({
    elements: [{ eleType: 'goalBar', goalProperty: 'g' }, { eleType: 'data', dataProperty: 'd' }],
    properties: { g: { value: 2, options: [{ value: 1, metricSymbol: ':FIELD_TYPE_HEART_RATE' }, { value: 2, metricSymbol: ':FIELD_TYPE_STEPS' }] }, d: { value: 9 } },
    dataOptions: { ':FIELD_TYPE_CALORIES': { valueCode: 9, metricSymbol: ':FIELD_TYPE_CALORIES' } }
  })).toBe('activity goals, steps, calories')
})
