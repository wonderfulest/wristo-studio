import { describe, expect, it } from 'vitest'
import { formatInlineMetricUnit } from './inlineMetricUnit'

describe('temperature display suffix', () => {
  it.each([['24', '24°'], ['-5', '-5°'], ['18/29', '18/29°'], ['24°', '24°'], ['', ''], ['--', '--']])('formats %s as %s', (value, expected) => {
    expect(formatInlineMetricUnit('temperature', value)).toBe(expected)
  })
  it.each([
    ':FIELD_TYPE_TEMPERATURE', ':FIELD_TYPE_FEELS_LIKE_TEMPERATURE',
    ':FIELD_TYPE_TEMPERATURE_HIGH', ':FIELD_TYPE_TEMPERATURE_LOW',
    ':FIELD_TYPE_TEMPERATURE_RANGE', ':FIELD_TYPE_SENSOR_TEMPERATURE',
    ':FIELD_TYPE_WEATHER',
  ])('adds degrees for %s with no standalone unit', (symbol) => {
    expect(formatInlineMetricUnit('none', '24', symbol)).toBe('24°')
    expect(formatInlineMetricUnit('none', '-5', symbol)).toBe('-5°')
    expect(formatInlineMetricUnit('none', '24°', symbol)).toBe('24°')
    expect(formatInlineMetricUnit('none', '--', symbol)).toBe('--')
    expect(formatInlineMetricUnit('none', '', symbol)).toBe('')
  })
  it('keeps other metrics unchanged', () => {
    expect(formatInlineMetricUnit('percentage', '82')).toBe('82')
    expect(formatInlineMetricUnit('distance', '5')).toBe('5')
  })
})
