import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/config/axios', () => ({ default: { post } }))

import { analogAssetApi } from './analogAsset'

describe('analogAssetApi', () => {
  beforeEach(() => post.mockReset())

  it('updates sharing for the exact uploaded asset ids', async () => {
    post.mockResolvedValue({ data: true })

    await analogAssetApi.updateSharing([11, 12], true)

    expect(post).toHaveBeenCalledWith('/dsn/analog-asset/sharing', [11, 12], {
      params: { isShared: true },
    })
  })
})
