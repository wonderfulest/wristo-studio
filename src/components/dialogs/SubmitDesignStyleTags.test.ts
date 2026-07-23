import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { ProductTag } from '@/types/api/productTag'
import type { Design, DesignSubmitDTO, UpdateDesignParamsV2 } from '@/types/api/design'
import type { Product } from '@/types/product'
import {
  restoreEnabledStyleTagIds,
  validateStyleTagIds,
} from './submitDesignStyleTags'

const tag = (id: number): ProductTag => ({
  id,
  name: `tag-${id}`,
  slug: `tag-${id}`,
  tagGroup: 'style',
  sort: id,
  status: 1,
})

describe('restoreEnabledStyleTagIds', () => {
  it('restores only available IDs in API option order and caps the result at five', () => {
    const options = [tag(7), tag(2), tag(9), tag(4), tag(6), tag(8)]

    expect(restoreEnabledStyleTagIds([8, 6, 4, 9, 2, 7, 404], options)).toEqual([
      7, 2, 9, 4, 6,
    ])
  })

  it('returns an empty selection when product tags are absent', () => {
    expect(restoreEnabledStyleTagIds(undefined, [tag(1)])).toEqual([])
    expect(restoreEnabledStyleTagIds(null, [tag(1)])).toEqual([])
  })
})

describe('validateStyleTagIds', () => {
  it('accepts one to five unique numeric IDs', () => {
    expect(validateStyleTagIds([1])).toBe('valid')
    expect(validateStyleTagIds([1, 2, 3, 4, 5])).toBe('valid')
  })

  it('rejects empty, overflow, duplicate, and non-numeric selections', () => {
    expect(validateStyleTagIds([])).toBe('required')
    expect(validateStyleTagIds([1, 2, 3, 4, 5, 6])).toBe('limit')
    expect(validateStyleTagIds([1, 1])).toBe('invalid')
    expect(validateStyleTagIds([1, '2'])).toBe('invalid')
  })
})

describe('SubmitDesignDialog style tag integration', () => {
  const source = readFileSync(
    fileURLToPath(new URL('./SubmitDesignDialog.vue', import.meta.url)),
    'utf8',
  )

  it('removes category orchestration from this dialog only', () => {
    expect(source).not.toContain('CategorySelector')
    expect(source).not.toContain('loadCategories')
    expect(source).not.toContain('categoryIds')
  })
})

describe('style tag request and product contracts', () => {
  it('accepts tag IDs in both design request DTOs', () => {
    const submit = { designUid: 'design', paymentMethod: 'free', tagIds: [1] } satisfies DesignSubmitDTO
    const update = { uid: 'design', tagIds: [1] } satisfies UpdateDesignParamsV2

    expect(submit.tagIds).toEqual([1])
    expect(update.tagIds).toEqual([1])
  })

  it('exposes nullable product tags', () => {
    const product: Pick<Product, 'tags'> = { tags: null }
    const taggedProduct: Pick<Design['product'], 'tags'> = { tags: [tag(1)] }

    expect(product.tags).toBeNull()
    expect(taggedProduct.tags?.[0].id).toBe(1)
  })
})
