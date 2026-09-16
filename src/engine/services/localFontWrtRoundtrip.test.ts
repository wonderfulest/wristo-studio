import JSZip from 'jszip'
import { afterEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { packageFonts, packageFontBuildFiles } from './packageAssetRegistry'
vi.hoisted(() => {
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(globalThis, key, {
    configurable: true, value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  })
})
vi.mock('@/api/image', () => ({ findImageByUrl: vi.fn(async () => ({ data: null })) }))
vi.mock('@/api/wristo/fonts', () => ({ getFontBySlug: vi.fn(async () => ({ data: null })) }))
afterEach(() => { packageFonts.clear(); packageFontBuildFiles.clear() })
it('preserves imported local bitmap font build files when repackaging for upload', async () => {
  setActivePinia(createPinia())
  const { buildWrtDesignPackage, readWrtDesignPackage } = await import('./designAssetBundleService')
  const slug = 'local-test-icons'
  const descriptor = new Blob(['info face="local-test-icons" size=30\ncommon lineHeight=30 base=30 scaleW=1 scaleH=1 pages=1\npage id=0 file="icons.png"\nchars count=1\nchar id=65 x=0 y=0 width=1 height=1 xadvance=30 page=0\n'])
  const atlas = new Blob([Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'))], { type: 'image/png' })
  const descriptorUrl = URL.createObjectURL(descriptor)
  const atlasUrl = URL.createObjectURL(atlas)
  try {
    packageFonts.set(slug, { slug, name: slug, type: 'icon_font', bitmapPreviewSize: 30, bitmapPreviewDescriptorUrl: descriptorUrl, bitmapPreviewAtlasUrl: atlasUrl } as any)
    packageFontBuildFiles.set(slug, new Map([['30/icons.fnt', descriptor], ['30/icons.png', atlas]]))
    const config: any = { name: 'Local icon', version: '1', designId: 'local-test', properties: {}, orderIds: ['icon'], elements: [{ id: 'icon', eleType: 'icon', fontFamily: slug, iconFont: slug, fontSize: 30 }], bitmapMode: false }
    let output = await buildWrtDesignPackage(config)
    for (let round = 0; round < 2; round++) {
      const zip = await JSZip.loadAsync(await output.arrayBuffer())
      const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
      const font = manifest.fonts.find((entry: any) => entry.slug === slug)
      expect(font.buildFiles).toHaveLength(2)
      expect(await zip.file(font.buildFiles.find((entry: any) => entry.path.endsWith('.fnt')).path)!.async('string')).toBe(await descriptor.text())
      const imported = await readWrtDesignPackage(output)
      output = await buildWrtDesignPackage(imported.config)
    }
  } finally { URL.revokeObjectURL(descriptorUrl); URL.revokeObjectURL(atlasUrl) }
})
