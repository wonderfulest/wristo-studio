import { describe, expect, it } from 'vitest'
import { normalizePositiveAppId } from './designSearch'

describe('normalizePositiveAppId', () => {
  it('returns an exact positive integer app ID', () => {
    expect(normalizePositiveAppId(' 163910 ')).toBe(163910)
  })

  it.each(['', '0', '-1', '16.5', 'abc', '12abc'])(
    'omits invalid App ID input %s',
    value => {
      expect(normalizePositiveAppId(value)).toBeUndefined()
    }
  )
})
