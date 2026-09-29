import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ capture: vi.fn(), access: vi.fn(), restore: vi.fn(), register: vi.fn() }))
vi.mock('./localProjectSnapshot', () => ({ captureProjectSnapshot: mocks.capture, accessProjectDraft: mocks.access, restoreProjectSnapshot: mocks.restore }))
vi.mock('@/stores/fontStore', () => ({ useFontStore: () => ({ serverFonts: new Map(), registerServerFont: mocks.register }) }))
import { writeLocalProject, readLocalProject } from './guestProjectDraft'
import { packageBitmapChars, packageFontBuildFiles, packageArchiveExtras } from './packageAssetRegistry'

describe('guest draft durability', () => {
  beforeEach(() => { vi.resetAllMocks(); packageBitmapChars.clear(); packageFontBuildFiles.clear(); packageArchiveExtras.files.clear() })
  it('waits for asset capture and durable storage before resolving', async () => {
    let capture!: (value: any) => void
    mocks.capture.mockReturnValue(new Promise(resolve => { capture = resolve }))
    let stored!: () => void
    mocks.access.mockReturnValue(new Promise<void>(resolve => { stored = resolve }))
    let done = false
    const save = writeLocalProject('local-test', { name: 'Draft' } as any).then(() => { done = true })
    expect(mocks.access).not.toHaveBeenCalled()
    capture({ config: { config: { name: 'Draft' } }, assets: {}, fonts: [] })
    await vi.waitFor(() => expect(mocks.access).toHaveBeenCalled())
    expect(done).toBe(false)
    stored(); await save
    expect(done).toBe(true)
  })
  it('propagates quota failures so login stays in the editor', async () => {
    mocks.capture.mockResolvedValue({ config: {}, assets: {}, fonts: [] })
    mocks.access.mockRejectedValue(new Error('Quota exceeded'))
    await expect(writeLocalProject('local-quota', {} as any)).rejects.toThrow('Quota exceeded')
  })
  it('restores font build files and image bytes alongside config', async () => {
    const files = new Map([['font.fnt', new Blob(['font'])]])
    mocks.access.mockResolvedValue({ fontBuildFiles: new Map([['font', files]]), archiveExtras: { files: new Map([['image.png', new Blob(['image'])]]), productImages: [] } })
    mocks.restore.mockReturnValue({ config: { config: { name: 'Restored' }, bitmapChars: [[4, ['glyph']]] }, fonts: [{ slug: 'font' }] })
    expect(await readLocalProject('local-test')).toEqual({ name: 'Restored' })
    expect(packageFontBuildFiles.get('font')).toBe(files)
    expect(packageBitmapChars.get(4)).toEqual(['glyph'])
    expect(packageArchiveExtras.files.has('image.png')).toBe(true)
    expect(mocks.register).toHaveBeenCalledWith({ slug: 'font' })
  })
})
