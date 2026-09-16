import { describe, expect, it } from 'vitest'
import { formatDataNumberDisplay } from './dataNumberFormat'

describe('distance number formatting', () => {
  it.each([0, 3])('limits compact fallback to one decimal in mode %s', (mode) => {
    expect(formatDataNumberDisplay('12.3', 12.345625, mode, 3)).toBe('12.3')
  })

  it('matches Connect IQ compact formatting for whole values and large numbers', () => {
    expect(formatDataNumberDisplay('5.0', 5, 3, 4)).toBe('5')
    expect(formatDataNumberDisplay('1234.6', 1234.567, 3, 4)).toBe('1.2k')
  })
})
