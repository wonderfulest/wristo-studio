import { beforeEach, describe, expect, it, vi } from 'vitest'
const { upload, build } = vi.hoisted(() => ({ upload: vi.fn(), build: vi.fn() }))
vi.mock('@/api/wristo/design', () => ({ designApi: { uploadAssetBundle: upload } }))
vi.mock('./designAssetBundleService', () => ({ buildWrtDesignPackage: build }))
import { saveWrtProject } from './saveWrtProject'
beforeEach(() => { upload.mockReset(); build.mockReset() })
describe('save complete WRT project', () => {
  it('sends one complete package with the target design identity', async () => {
    const file = new Blob(['wrt'])
    build.mockResolvedValue(file)
    upload.mockResolvedValue({ code: 0, data: { version: 2 } })
    await expect(saveWrtProject('target', { designId: 'source' } as any)).resolves.toEqual({ version: 2 })
    expect(build.mock.calls[0][0].designId).toBe('target')
    expect(upload.mock.calls).toEqual([['target', file]])
  })
  it('does not upload an incomplete package or swallow server rejection', async () => {
    build.mockRejectedValueOnce(new Error('missing asset'))
    await expect(saveWrtProject('id', {} as any)).rejects.toThrow('missing asset')
    expect(upload).not.toHaveBeenCalled()
    build.mockResolvedValue(new Blob())
    upload.mockResolvedValue({ code: 1, msg: 'rejected' })
    await expect(saveWrtProject('id', {} as any)).rejects.toThrow('rejected')
  })
})
