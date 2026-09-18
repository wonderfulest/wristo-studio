import { afterEach, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import JSZip from 'jszip'
import { createPinia, setActivePinia } from 'pinia'
import { packageFonts, packageFontBuildFiles } from './packageAssetRegistry'

const { build, dispose } = vi.hoisted(() => ({ build: vi.fn(), dispose: vi.fn() }))
vi.hoisted(() => {
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(globalThis, key, {
    configurable: true, value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  })
})
vi.mock('@/features/bitmap-font-maker/workerClient', () => ({ BitmapFontWorkerClient: class { build = build; dispose = dispose } }))
vi.mock('@/api/image', () => ({ findImageByUrl: vi.fn() }))
vi.mock('@/api/wristo/fonts', () => ({ getFontBySlug: vi.fn() }))
vi.mock('@/api/wristo/weather', () => ({ getWeatherConditions: vi.fn() }))
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
async function input(corrupt = false) {
  const zip = new JSZip()
  const bytes = new Uint8Array([0, 1, 0, 0])
  const config = { version: '1', name: 'Source only', designId: 'test', properties: {}, orderIds: ['time'],
    elements: [{ id: 'time', eleType: 'time', fontFamily: 'fixture', fontSize: 36 }], bitmapMode: false }
  zip.file('design.json', JSON.stringify(config))
  zip.file('config/config.json', JSON.stringify(config))
  zip.file('fonts/fixture.ttf', bytes)
  zip.file('manifest.json', JSON.stringify({ version: 2, format: 'wristo-design-package', selfContained: true,
    design: { path: 'design.json' }, studio: { configPath: 'config/config.json', assetRefs: [] },
    fonts: [{ slug: 'fixture', path: 'fonts/fixture.ttf', sha256: corrupt ? 'bad' : digest(bytes) }], failures: [] }))
  return new File([await zip.generateAsync({ type: 'arraybuffer' })], 'source.wrt')
}
async function workerResult() {
  const zip = new JSZip()
  for (const size of [30, 312]) {
    zip.file(`${size}/fixture-g.fnt`, 'info face="Fixture"\npage id=0 file="fixture-g_0.png"\n')
    zip.file(`${size}/fixture-g_0.png`, new Uint8Array([137, 80, 78, 71]))
  }
  return { zip: await zip.generateAsync({ type: 'arraybuffer' }) }
}
afterEach(async () => {
  const { clearRestoredDesignAssetUrls } = await import('./designAssetBundleService')
  clearRestoredDesignAssetUrls(); packageFonts.clear(); packageFontBuildFiles.clear(); vi.clearAllMocks()
})
it('automatically builds source-only fonts and preserves them through save and reopen without rebuilding', async () => {
  setActivePinia(createPinia())
  build.mockReturnValue({ result: workerResult() })
  const { readWrtDesignPackage, buildWrtDesignPackage } = await import('./designAssetBundleService')
  const imported = await readWrtDesignPackage(await input())
  expect(build).toHaveBeenCalledOnce()
  expect(build.mock.calls[0][0]).toMatchObject({ slug: 'fixture', preserveSource: true })
  expect(packageFonts.get('fixture')?.bitmapPreviewAtlasUrl).toMatch(/^blob:/)
  expect(packageFontBuildFiles.get('fixture')?.size).toBe(4)
  const saved = await buildWrtDesignPackage(imported.config)
  await readWrtDesignPackage(saved)
  expect(build).toHaveBeenCalledOnce()
  expect(packageFontBuildFiles.get('fixture')?.size).toBe(4)
  expect(dispose).toHaveBeenCalledOnce()
})
it('rejects corrupt TTF bytes before starting a worker', async () => {
  setActivePinia(createPinia())
  const { readWrtDesignPackage } = await import('./designAssetBundleService')
  await expect(readWrtDesignPackage(await input(true))).rejects.toThrow('Missing or corrupt package asset')
  expect(build).not.toHaveBeenCalled()
})
it('preserves current project fonts and disposes the worker on a build failure', async () => {
  setActivePinia(createPinia())
  packageFonts.set('current', { slug: 'current' } as any)
  build.mockImplementation(() => ({ result: Promise.reject(new Error('Invalid TTF')) }))
  const { readWrtDesignPackage } = await import('./designAssetBundleService')
  await expect(readWrtDesignPackage(await input())).rejects.toThrow('Invalid TTF')
  expect(packageFonts.has('current')).toBe(true)
  expect(dispose).toHaveBeenCalledOnce()
})
