import { describe, expect, it } from 'vitest'
import { matchesDataOptionSearch } from './dataOptionSearch'

const temperature = {
  metricSymbol: ':FIELD_TYPE_TEMPERATURE:',
  settingsLabel: { eng: 'Temperature', zhs: '温度' },
  label: 'Temperature',
}

describe('data option search', () => {
  it.each(['wendu', 'wd'])('matches a Chinese label by pinyin query %s', (query) => {
    expect(matchesDataOptionSearch(temperature, query)).toBe(true)
  })

  it.each(['温度', 'temperature', 'field_type_temperature'])('preserves existing matching for %s', (query) => {
    expect(matchesDataOptionSearch(temperature, query)).toBe(true)
  })

  it('does not match unrelated pinyin', () => {
    expect(matchesDataOptionSearch(temperature, 'xintiao')).toBe(false)
  })
})
