import { describe, expect, it } from 'vitest'
import {
  getDesignSortFields,
  normalizeDesignSort,
  toDesignOrderBy,
} from './designSort'

describe('design list sorting', () => {
  it('offers Store weight only to administrators', () => {
    expect(getDesignSortFields(false)).toEqual(['created_at', 'updated_at'])
    expect(getDesignSortFields(true)).toEqual(['created_at', 'updated_at', 'store_weight'])
  })

  it('forces Store weight to descending for administrators', () => {
    expect(normalizeDesignSort('store_weight', 'asc', true)).toEqual({
      field: 'store_weight',
      order: 'desc',
    })
    expect(toDesignOrderBy('store_weight', 'asc', true)).toBe('store_weight:desc')
  })

  it('falls back to updated time when a non-administrator restores Store weight', () => {
    expect(normalizeDesignSort('store_weight', 'desc', false)).toEqual({
      field: 'updated_at',
      order: 'desc',
    })
  })
})
