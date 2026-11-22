import { describe, expect, it } from 'vitest'
import { hasUnpublishedRelease } from './unpublishedRelease'
import type { DesignListItem } from '@/types/api/design'

describe('unpublished release indicator', () => {
  it.each([
    [undefined, undefined, false],
    [1000, undefined, true],
    [2000, 1000, true],
    [1000, 1000, false],
    [1000, 2000, false],
    ['2026-11-22T12:00:00', '2026-11-22T11:00:00', true],
    ['invalid', undefined, false],
  ])('compares package %s with publication %s', (updatedAt, lastGoLive, expected) => {
    const design = { product: { lastGoLive, release: updatedAt === undefined ? undefined : { updatedAt } } } as DesignListItem
    expect(hasUnpublishedRelease(design)).toBe(expected)
  })
})
