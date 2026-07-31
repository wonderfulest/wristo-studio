import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/config/axios', () => ({ default: { post } }))

import { productsApi } from './products'

describe('productsApi.updateStoreWeight', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('posts only the Store weight to the administrator Store-display endpoint', async () => {
    const response = { code: 0, data: { appId: 165591, storeWeight: 30 } }
    post.mockResolvedValue(response)

    await expect(productsApi.updateStoreWeight(165591, 30)).resolves.toBe(response)
    expect(post).toHaveBeenCalledWith('/admin/products/store-display/165591', {
      storeWeight: 30,
    })
  })
})
