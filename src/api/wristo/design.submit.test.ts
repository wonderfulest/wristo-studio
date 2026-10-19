import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), prepareWrtBuild: vi.fn(), uploadDesignAssetBundle: vi.fn(),
}))
vi.mock('@/config/axios', () => ({ default: { get: mocks.get, post: mocks.post } }))
vi.mock('@/engine/services/prepareWrtBuild', () => ({ prepareWrtBuild: mocks.prepareWrtBuild }))
vi.mock('./designAssetUpload', () => ({ uploadDesignAssetBundle: mocks.uploadDesignAssetBundle }))

import { designApi } from './design'

describe('background design build submission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.post.mockResolvedValue({ code: 0, data: true })
  })

  it('posts the saved version without reading, generating or uploading a WRT', async () => {
    await designApi.submitDesign({
      designUid: 'design-uid', expectedVersion: 23, paymentMethod: 'free',
      originalType: 'original', name: '  Saved   design ', targetDeviceIds: ['venu3'],
    })
    expect(mocks.post).toHaveBeenCalledWith('/dsn/design/submit', {
      designUid: 'design-uid', expectedVersion: 23, paymentMethod: 'free',
      originalType: 'original', name: 'Saved design', description: undefined, targetDeviceIds: ['venu3'],
    })
    expect(mocks.prepareWrtBuild).not.toHaveBeenCalled()
    expect(mocks.get).not.toHaveBeenCalled()
    expect(mocks.uploadDesignAssetBundle).not.toHaveBeenCalled()
  })

  it('queues PRG directly without preparing a browser WRT', async () => {
    await designApi.submitPrgPackageTask('design-uid', 'venu3')
    expect(mocks.post).toHaveBeenCalledTimes(1)
    expect(mocks.post).toHaveBeenCalledWith('/dsn/design/submit-prg-package?designUid=design-uid&deviceId=venu3')
    expect(mocks.prepareWrtBuild).not.toHaveBeenCalled()
    expect(mocks.get).not.toHaveBeenCalled()
    expect(mocks.uploadDesignAssetBundle).not.toHaveBeenCalled()
  })
})
