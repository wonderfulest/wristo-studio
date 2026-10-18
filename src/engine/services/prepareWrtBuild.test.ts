import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }))
vi.mock('@/api/wristo/design', () => ({ designApi: { getDesignByUid: mocks.get } }))
vi.mock('./saveWrtProject', () => ({ saveWrtProject: mocks.save }))
vi.mock('@/api/wristo/upload', () => ({ uploadPersistentDesignAsset: vi.fn() }))
import { prepareWrtBuild } from './prepareWrtBuild'
import { packageFonts } from './packageAssetRegistry'
import { clearJsonProjectFiles } from './jsonProject'
beforeEach(() => { mocks.get.mockReset(); mocks.save.mockReset(); packageFonts.clear(); clearJsonProjectFiles() })
it('builds the latest persisted JSON and restores the open editor resources afterwards', async () => {
  const openFont = { slug: 'open-font' } as any
  packageFonts.set('open-font', openFont)
  mocks.get.mockResolvedValue({ code: 0, data: { designUid: 'target', version: 7, name: 'Latest', configJson: {
    name: 'Old name', designId: 'source', elements: [], studioResources: { version: 1, fonts: [['target-font', { slug: 'target-font' }]], bitmapChars: [], fontBuildFiles: [], files: [], productImages: [] }
  } } })
  mocks.save.mockImplementation(async (_uid, config) => {
    expect(config.designId).toBe('target'); expect(config.name).toBe('Latest')
    expect([...packageFonts.keys()]).toEqual(['target-font'])
  })
  await prepareWrtBuild('target')
  expect(mocks.save).toHaveBeenCalledWith('target', expect.any(Object), expect.objectContaining({ expectedVersion: 7 }))
  expect([...packageFonts]).toEqual([['open-font', openFont]])
})
it('does not regenerate legacy packages, and propagates lookup failures', async () => {
  mocks.get.mockResolvedValueOnce({ code: 0, data: { configJson: {} } })
  await prepareWrtBuild('legacy')
  expect(mocks.save).not.toHaveBeenCalled()
  mocks.get.mockResolvedValueOnce({ code: 1, msg: 'denied' })
  await expect(prepareWrtBuild('unavailable')).rejects.toThrow('denied')
})
it('restores open resources even when WRT generation fails', async () => {
  packageFonts.set('open-font', { slug: 'open-font' } as any)
  mocks.get.mockResolvedValue({ code: 0, data: { version: 7, name: 'Target', configJson: { studioResources: { version: 1 } } } })
  mocks.save.mockRejectedValue(new Error('font unavailable'))
  await expect(prepareWrtBuild('target')).rejects.toThrow('font unavailable')
  expect([...packageFonts.keys()]).toEqual(['open-font'])
})
