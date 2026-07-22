import { describe, expect, it } from 'vitest'
import {
  groupProductImages,
  normalizeProductImage,
  remainingProductImageSlots,
  toProductImageSelections,
} from './productImageModel'

describe('product image model', () => {
  it('groups historical share images as social without losing the source type', () => {
    const item = normalizeProductImage({
      id: 91,
      imageId: 301,
      type: 'share',
      image: { id: 301, url: '/original.png', formats: { thumbnail: { url: '/thumb.png' } } },
    })

    expect(item).toMatchObject({ id: 301, relationId: 91, type: 'share', imageUrl: '/thumb.png' })
    expect(groupProductImages([item!]).social).toEqual([item])
  })

  it('uses one twenty-image capacity across product and social groups', () => {
    const items = Array.from({ length: 3 }, (_, index) => ({
      id: index + 1,
      type: index === 0 ? 'product' as const : 'social' as const,
      imageUrl: `/${index}.png`,
    }))

    expect(groupProductImages(items).product).toHaveLength(1)
    expect(groupProductImages(items).social).toHaveLength(2)
    expect(remainingProductImageSlots(items)).toBe(17)
  })

  it('serializes one global order and normalizes share to social', () => {
    expect(toProductImageSelections([
      { id: 1, type: 'product', imageUrl: '/one.png' },
      { id: 2, type: 'share', imageUrl: '/two.png' },
    ])).toEqual([
      { imageId: 1, type: 'product', sortOrder: 0 },
      { imageId: 2, type: 'social', sortOrder: 1 },
    ])
  })
})
