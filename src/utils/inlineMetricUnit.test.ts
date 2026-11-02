import { describe, expect, it } from 'vitest'
import { formatInlineMetricUnit } from './inlineMetricUnit'

describe('temperature display suffix', () => {
  it.each([['24', '24°'], ['-5', '-5°'], ['18/29', '18/29°'], ['24°', '24°'], ['', ''], ['--', '--']])('formats %s as %s', (value, expected) => {
    expect(formatInlineMetricUnit('temperature', value)).toBe(expected)
  })
  it('keeps other metrics unchanged', () => {
    expect(formatInlineMetricUnit('percentage', '82')).toBe('82')
    expect(formatInlineMetricUnit('distance', '5')).toBe('5')
  })
})
