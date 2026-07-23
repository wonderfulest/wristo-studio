import { describe, expect, it } from 'vitest'
import { filterEnabledStyleTags, limitStyleTagSelection } from './styleTagSelection'

describe('filterEnabledStyleTags', () => {
  it('keeps enabled style tags in API order', () => {
    const items = [
      { id: 4, tagGroup: 'style', status: 1 },
      { id: 2, tagGroup: 'feature', status: 1 },
      { id: 7, tagGroup: 'style', status: 0 },
      { id: 1, tagGroup: 'style', status: 1 },
    ]

    expect(filterEnabledStyleTags(items)).toEqual([items[0], items[3]])
  })

  it('returns an empty list for nullish input', () => {
    expect(filterEnabledStyleTags(null)).toEqual([])
    expect(filterEnabledStyleTags(undefined)).toEqual([])
  })
})

describe('limitStyleTagSelection', () => {
  it('returns unique numeric next IDs in their original order', () => {
    expect(limitStyleTagSelection([], [3, 3, 1, 2, 1])).toEqual({
      ids: [3, 1, 2],
      exceeded: false,
    })
  })

  it('keeps the previous five IDs when a sixth ID is selected', () => {
    expect(limitStyleTagSelection([1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6])).toEqual({
      ids: [1, 2, 3, 4, 5],
      exceeded: true,
    })
  })

  it('uses five as the default limit', () => {
    expect(limitStyleTagSelection([], [1, 2, 3, 4, 5])).toEqual({
      ids: [1, 2, 3, 4, 5],
      exceeded: false,
    })
    expect(limitStyleTagSelection([9, 8, 7, 6, 5], [1, 2, 3, 4, 5, 6])).toEqual({
      ids: [9, 8, 7, 6, 5],
      exceeded: true,
    })
  })

  it('filters invalid values and caps an invalid previous selection', () => {
    expect(
      limitStyleTagSelection(
        [1, 1, Number.NaN, 2, 3, 4, 5, 6],
        [7, 8, 9, 10, 11, 12],
      ),
    ).toEqual({ ids: [1, 2, 3, 4, 5], exceeded: true })
  })

  it.each([
    { limit: 2, expected: [9, 8] },
    { limit: 2.9, expected: [9, 8] },
    { limit: -1, expected: [] },
    { limit: Number.POSITIVE_INFINITY, expected: [9, 8, 7, 6, 5] },
    { limit: Number.NaN, expected: [9, 8, 7, 6, 5] },
  ])('normalizes the custom limit $limit', ({ limit, expected }) => {
    expect(limitStyleTagSelection([9, 8, 7, 6, 5, 4], [1, 2, 3, 4, 5, 6], limit)).toEqual({
      ids: expected,
      exceeded: true,
    })
  })
})
