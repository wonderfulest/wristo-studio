import { describe, expect, it } from 'vitest'
import type { ProductTag } from '@/types/api/productTag'
import {
  filterEnabledProductTags,
  restorePublishedTagIds,
  validatePublishedTagIds,
} from './goLiveTags'

const tags: ProductTag[] = [
  { id: 1, name: 'Minimal', slug: 'minimal', tagGroup: 'style', sort: 3, status: 1 },
  { id: 28, name: 'AMOLED', slug: 'amoled', tagGroup: 'function', sort: 2, status: 1 },
  { id: 38, name: 'Everyday', slug: 'everyday', tagGroup: 'scene', sort: 1, status: 1 },
  { id: 49, name: 'Christmas', slug: 'christmas', tagGroup: 'seasonal', sort: 0, status: 0 },
]

describe('Go Live product tags', () => {
  it('keeps every enabled group in API order', () => {
    expect(filterEnabledProductTags(tags).map(tag => tag.id)).toEqual([1, 28, 38])
  })

  it('restores selected enabled tags in API order and caps at five', () => {
    const options = Array.from({ length: 7 }, (_, index) => ({
      ...tags[index % 3],
      id: index + 1,
      status: 1,
    }))

    expect(restorePublishedTagIds(options, [7, 3, 1, 4, 6, 2])).toEqual([1, 2, 3, 4, 6])
  })

  it('requires one to five unique numeric IDs', () => {
    expect(validatePublishedTagIds([])).toBe('required')
    expect(validatePublishedTagIds([1, 1])).toBe('invalid')
    expect(validatePublishedTagIds([1, 2, 3, 4, 5, 6])).toBe('invalid')
    expect(validatePublishedTagIds([1, 28, 38])).toBeNull()
  })
})
