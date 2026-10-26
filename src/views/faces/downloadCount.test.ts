import { describe, expect, it } from 'vitest'
import { formatDownloadCount } from './downloadCount'

describe('download count visibility', () => {
  it.each([
    [0, '0'], [1, '1+'], [9, '1+'], [10, '10+'], [99, '10+'],
    [100, '100+'], [999, '100+'], [1000, '1K+'], [9999, '1K+'],
    [10000, '10K+'], [99999, '10K+'], [100000, '100K+'],
    [1000000, '1M+'],
  ])('groups %i as %s for public viewers', (count, expected) => {
    expect(formatDownloadCount(count, false)).toBe(expected)
  })

  it('preserves exact counts for privileged viewers', () => {
    expect(formatDownloadCount(12345, true)).toBe((12345).toLocaleString())
  })
})
