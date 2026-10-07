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
    expect(upload).toHaveBeenCalledWith('target', file, expect.any(Function))
  })
  it('forwards build and server stages and records timing without private content', async () => {
    const progress = vi.fn()
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    build.mockImplementation(async (_config, options) => {
      options.onStage('assets')
      options.onStage('compressing', 40)
      return new Blob(['archive'])
    })
    upload.mockImplementation(async (_id, _file, report) => {
      report({ stage: 'processing' })
      report({ stage: 'saved' })
      return { code: 0, data: { version: 3 } }
    })
    await saveWrtProject('private-id', {} as any, { onSaveProgress: progress })
    expect(progress.mock.calls.map(([value]) => value.stage)).toEqual(['assets', 'compressing', 'processing', 'saved'])
    expect(log).toHaveBeenCalledWith('[WRT save]', expect.objectContaining({ succeeded: true, packageBytes: 7 }))
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-id')
    log.mockRestore()
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
