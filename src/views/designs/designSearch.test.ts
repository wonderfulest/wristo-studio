import { describe, expect, it } from 'vitest'
import { normalizePositiveAppId, isPackagedVersion } from './designSearch'

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

describe('packaged version input', () => {
  it.each(['1.0.0', ' 1.10.0 ', '999999999.0.1'])('accepts %s', value => {
    expect(isPackagedVersion(value)).toBe(true)
  })
  it.each(['', '1.0', '1.2.3.4', '-1.0.0', '1.0.0-beta', '1000000000.0.0', 'abc'])('rejects %s', value => {
    expect(isPackagedVersion(value)).toBe(false)
  })
})
