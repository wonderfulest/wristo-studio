import { beforeEach, expect, it, vi } from 'vitest'
const { update, upload } = vi.hoisted(() => ({ update: vi.fn(), upload: vi.fn() }))
vi.mock('@/api/wristo/design', () => ({ designApi: { updateDesign: update } }))
vi.mock('@/api/wristo/upload', () => ({ uploadPersistentDesignAsset: upload }))
import { saveJsonProject, restoreJsonProject, hydrateJsonProjectFiles, clearJsonProjectFiles } from './jsonProject'
import { packageFonts, packageFontBuildFiles, packageBitmapChars, packageArchiveExtras } from './packageAssetRegistry'
const config = () => ({ designId: 'source', name: 'Face', elements: [], properties: {} } as any)
beforeEach(() => {
  clearJsonProjectFiles()
  packageFonts.clear(); packageFontBuildFiles.clear(); packageBitmapChars.clear(); packageArchiveExtras.files.clear()
  packageArchiveExtras.productImages = []; packageArchiveExtras.preview = undefined
  update.mockReset().mockResolvedValue({ code: 0, data: { designUid: 'target' } })
  upload.mockReset().mockResolvedValue('https://assets.test/persisted')
  vi.unstubAllGlobals()
})
it('saves JSON directly with the target identity and no archive', async () => {
  await saveJsonProject('target', config())
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ uid: 'target', configJson: expect.objectContaining({ designId: 'target', studioResources: expect.objectContaining({ version: 1 }) }) }))
  expect(upload).not.toHaveBeenCalled()
})
it('persists imported font metadata and image bytes once across repeat saves', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['font'], { type: 'font/ttf' }) }))
  packageFonts.set('local-test', { slug: 'local-test', ttfFile: { url: 'blob:unique-font' } } as any)
  const input = config(); input.elements = [{ imageUrl: 'data:image/png;base64,AQ==' }]
  await saveJsonProject('target', input)
  await saveJsonProject('target', input)
  expect(upload).toHaveBeenCalledTimes(2)
  const saved = update.mock.calls[0][0].configJson
  expect(saved.studioResources.fonts[0][1].ttfFile.url).toBe('https://assets.test/persisted')
  expect(saved.elements[0].imageUrl).toBe('https://assets.test/persisted')
  expect(input.elements[0].imageUrl).toMatch(/^data:/)
})
it('restores font metadata without fetching build files until export', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['build']) })
  vi.stubGlobal('fetch', fetcher)
  const input = { ...config(), studioResources: { version: 1, fonts: [['local-test', { slug: 'local-test' }]], bitmapChars: [], fontBuildFiles: [['local-test', [['font.fnt', 'https://assets.test/font.fnt']]]], files: [], productImages: [] } }
  restoreJsonProject(input)
  expect(packageFonts.has('local-test')).toBe(true)
  expect(fetcher).not.toHaveBeenCalled()
  await hydrateJsonProjectFiles()
  expect(packageFontBuildFiles.get('local-test')?.has('font.fnt')).toBe(true)
})
it('preserves lazy file references when saving without exporting first', async () => {
  const input = { ...config(), studioResources: { version: 1, fonts: [], bitmapChars: [], fontBuildFiles: [['local-test', [['font.fnt', 'https://assets.test/font.fnt']]]], files: [], productImages: [] } }
  restoreJsonProject(input)
  await saveJsonProject('target', config())
  expect(update.mock.calls[0][0].configJson.studioResources.fontBuildFiles).toEqual(input.studioResources.fontBuildFiles)
  expect(upload).not.toHaveBeenCalled()
})
it('never updates JSON if a resource cannot be persisted and surfaces API failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('missing bytes')))
  await expect(saveJsonProject('target', { ...config(), imageUrl: 'blob:missing-test' })).rejects.toThrow('missing bytes')
  expect(update).not.toHaveBeenCalled()
  update.mockResolvedValue({ code: 1, msg: 'rejected' })
  await expect(saveJsonProject('target', config())).rejects.toThrow('rejected')
})

it('copies expiring OSS and S3 links to durable resources while leaving public URLs unchanged', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['asset'], { type: 'image/png' }) })
  vi.stubGlobal('fetch', fetcher)
  await saveJsonProject('target', { ...config(), elements: [
    { imageUrl: 'https://cdn.test/image?Expires=123&OSSAccessKeyId=key&Signature=sig' },
    { imageUrl: 'https://s3.test/image?X-Amz-Signature=signature' },
    { imageUrl: 'https://public.test/permanent.png' },
  ] })
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(update.mock.calls[0][0].configJson.elements.map((e: any) => e.imageUrl)).toEqual([
    'https://assets.test/persisted', 'https://assets.test/persisted', 'https://public.test/permanent.png',
  ])
})

it('persists resources with bounded concurrency and reports collection progress', async () => {
  let active = 0, peak = 0
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['image']) }))
  upload.mockImplementation(async () => {
    active++; peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, 5))
    active--
    return 'https://assets.test/concurrent'
  })
  const progress = vi.fn()
  await saveJsonProject('target', { ...config(), elements: Array.from({ length: 9 }, (_, i) => ({ imageUrl: `blob:concurrency-${i}` })) }, { onSaveProgress: progress })
  expect(peak).toBe(4)
  expect(upload).toHaveBeenCalledTimes(9)
  expect(progress).toHaveBeenCalledWith({ stage: 'assets', percent: 100 })
})

it('times out a stalled resource body and allows a later retry', async () => {
  vi.useFakeTimers()
  try {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, blob: () => new Promise(() => {}) })
    vi.stubGlobal('fetch', fetcher)
    const input = { ...config(), imageUrl: 'blob:stalled-retry' }
    const pending = saveJsonProject('target', input)
    const rejected = expect(pending).rejects.toThrow(/timed out/i)
    await vi.advanceTimersByTimeAsync(30000)
    await rejected
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true)
    expect(update).not.toHaveBeenCalled()
    fetcher.mockResolvedValue({ ok: true, blob: async () => new Blob(['ok']) })
    await saveJsonProject('target', input)
    expect(update).toHaveBeenCalledTimes(1)
  } finally { vi.useRealTimers() }
})

it('includes imported build files in the same progress and concurrency limit', async () => {
  let active = 0, peak = 0
  upload.mockImplementation(async () => {
    active++; peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, 2))
    active--
    return 'https://assets.test/build-file'
  })
  packageFontBuildFiles.set('font', new Map(Array.from({ length: 6 }, (_, i) => [`font-${i}.fnt`, new Blob([String(i)])])))
  packageArchiveExtras.files.set('preview.png', new Blob(['preview']))
  const progress = vi.fn()
  await saveJsonProject('target', config(), { onSaveProgress: progress })
  expect(peak).toBe(4)
  expect(upload).toHaveBeenCalledTimes(7)
  expect(progress).toHaveBeenCalledWith({ stage: 'assets', percent: 100 })
  await saveJsonProject('target', config())
  expect(upload).toHaveBeenCalledTimes(7)
})
