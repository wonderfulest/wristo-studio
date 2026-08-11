import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/config/axios', () => ({ default: { get } }))

import { getProductTagsPage } from './productTags'
import type { ProductTag } from '@/types/api/productTag'

describe('getProductTagsPage', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('loads and merges every Dsn product-tag page', async () => {
    get
      .mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: { pageNum: 1, pageSize: 50, total: 56, pages: 2, list: [{ id: 1 }] },
      })
      .mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: { pageNum: 2, pageSize: 50, total: 56, pages: 2, list: [{ id: 56 }] },
      })

    const response = await getProductTagsPage()

    expect(response.data?.list).toEqual([{ id: 1 }, { id: 56 }])
    expect(get).toHaveBeenNthCalledWith(1, '/dsn/product-tags/page', {
      params: {
        pageNum: 1,
        pageSize: 50,
        orderBy: 'sort:desc',
      },
    })
    expect(get).toHaveBeenNthCalledWith(2, '/dsn/product-tags/page', {
      params: {
        pageNum: 2,
        pageSize: 50,
        orderBy: 'sort:desc',
      },
    })
  })

  it('supports absent and null wire metadata fields on product tags', () => {
    const minimalTag: ProductTag = {
      id: 1,
      name: 'Minimal',
      slug: 'minimal',
      tagGroup: 'style',
      sort: 10,
      status: 1,
    }
    const nullableTag: ProductTag = {
      ...minimalTag,
      description: null,
      appCount: null,
      createdAt: null,
      updatedAt: null,
    }

    expect([minimalTag, nullableTag]).toHaveLength(2)
  })
})
