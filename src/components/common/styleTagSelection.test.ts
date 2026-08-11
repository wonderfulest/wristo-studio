import { describe, expect, it } from 'vitest'
import { filterEnabledStyleTags, groupStyleTags, limitStyleTagSelection } from './styleTagSelection'

describe('filterEnabledStyleTags', () => {
  it('keeps enabled tags from every group in API order', () => {
    const items = [
      { id: 4, tagGroup: 'style', status: 1 },
      { id: 2, tagGroup: 'feature', status: 1 },
      { id: 7, tagGroup: 'style', status: 0 },
      { id: 1, tagGroup: 'style', status: 1 },
    ]

    expect(filterEnabledStyleTags(items)).toEqual([items[0], items[1], items[3]])
  })

  it('returns an empty list for nullish input', () => {
    expect(filterEnabledStyleTags(null)).toEqual([])
    expect(filterEnabledStyleTags(undefined)).toEqual([])
  })
})

describe('groupStyleTags', () => {
  it('groups tags by tagGroup while preserving group and tag order', () => {
    const items = [
      { id: 1, tagGroup: 'style', status: 1 },
      { id: 2, tagGroup: 'function', status: 1 },
      { id: 3, tagGroup: 'style', status: 1 },
      { id: 4, tagGroup: 'scene', status: 1 },
    ]

    expect(groupStyleTags(items)).toEqual([
      { name: 'style', tags: [items[0], items[2]] },
      { name: 'function', tags: [items[1]] },
      { name: 'scene', tags: [items[3]] },
    ])
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
