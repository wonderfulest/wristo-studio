import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/config/axios', () => ({ default: { get } }))

import { getProductTagsPage } from './productTags'

describe('getProductTagsPage', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('requests the admin product-tag page with the Studio picker defaults', async () => {
    const response = { code: 200, msg: 'success', data: { list: [] } }
    get.mockResolvedValue(response)

    await expect(getProductTagsPage()).resolves.toBe(response)
    expect(get).toHaveBeenCalledWith('/admin/product-tags/page', {
      params: {
        pageNum: 1,
        pageSize: 200,
        orderBy: 'sort:desc',
      },
    })
  })
})
