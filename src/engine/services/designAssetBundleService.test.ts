import JSZip from 'jszip'
import { packageArchiveExtras } from './packageAssetRegistry'
afterEach(() => { packageArchiveExtras.productImages = []; packageArchiveExtras.files.clear(); packageArchiveExtras.preview = undefined })
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { getBundleAssetMimeType } from '@/engine/services/bundleAssetMime'

const { getWeatherConditions } = vi.hoisted(() => ({
  getWeatherConditions: vi.fn(),
}))

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(), key: vi.fn(), length: 0 },
  })
})

vi.mock('@/api/image', () => ({ findImageByUrl: vi.fn(async () => ({ data: null })) }))
vi.mock('@/api/wristo/weather', () => ({ getWeatherConditions }))
vi.mock('@/api/wristo/fonts', () => ({ getFontBySlug: vi.fn(async () => ({ data: null })) }))

describe('design asset bundle MIME types', () => {
  it('restores SVG assets with an SVG image MIME type', () => {
    expect(getBundleAssetMimeType('assets/centerCap/center_cap.svg')).toBe('image/svg+xml')
  })

  it('restores common raster assets with their image MIME types', () => {
    expect(getBundleAssetMimeType('assets/background.png')).toBe('image/png')
    expect(getBundleAssetMimeType('assets/photo.jpg')).toBe('image/jpeg')
    expect(getBundleAssetMimeType('assets/photo.webp')).toBe('image/webp')
  })
})

describe('font asset collection', () => {
  it('restores and packages the custom font from legacy system-font elements', async () => {
    const { collectFontSlugs } = await import('./designAssetBundleService')
    expect(collectFontSlugs({
      elements: [
        { fontSource: 'system', systemFont: 'FONT_SMALL', fontFamily: 'fallback-font' },
        { fontSource: 'asset', fontFamily: 'packaged-font' },
      ],
    } as any)).toEqual(['fallback-font', 'packaged-font'])
  })
})

describe('archive progress', () => {
  it('round-trips a newly created empty API project', async () => {
    setActivePinia(createPinia())
    const { newProjectConfig } = await import('@/views/designs/newProjectConfig')
    const { buildWrtDesignPackage, readWrtDesignPackage } = await import('./designAssetBundleService')
    const config = newProjectConfig('{}', 'blank', 'Blank', 'zhs')
    const loaded = await readWrtDesignPackage(await buildWrtDesignPackage(config))
    expect(loaded.config.elements).toEqual([])
    expect(loaded.config.name).toBe('Blank')
    expect(loaded.config.localization?.appLanguage).toBe('zhs')
  })

  it('reports monotonic progress and only completes once the file is ready', async () => {
    setActivePinia(createPinia())
    const { buildWrtDesignPackage } = await import('./designAssetBundleService')
    const progress: number[] = []
    const file = await buildWrtDesignPackage({
      version: '1', properties: {}, designId: 'progress', name: 'Progress',
      textCase: 0, bitmapMode: false, orderIds: [], elements: [],
    } as any, { onProgress: percent => progress.push(percent) })
    expect(file.name).toMatch(/\.wrt$/)
    expect(progress[0]).toBe(0)
    expect(progress[progress.length - 1]).toBe(100)
    expect(progress.slice(0, -1).every(value => value < 100)).toBe(true)
    expect(progress.some(value => value > 80 && value < 100)).toBe(true)
    expect(progress.every((value, index) => index === 0 || value >= progress[index - 1])).toBe(true)
  })
})

describe('formal asset package layout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('wraps the package in appId-slug and exports typed marketing variants', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      new Blob(['png'], { type: 'image/png' }),
      { status: 200, headers: { 'content-type': 'image/png' } },
    )))
    const config = {
      version: '1', properties: {}, designId: 'design-1', name: 'Tiger', textCase: 0,
      bitmapMode: false, orderIds: [], elements: [],
    }
    const { buildDesignAssetBundle } = await import('@/engine/services/designAssetBundleService')
    const file = await buildDesignAssetBundle(config as any, {
      appId: 163910,
      product: {
        productImages: [{
          id: 700,
          imageId: 101,
          type: 'social',
          imageUrl: 'https://cdn/poster.png',
          image: {
            id: 101,
            name: 'poster.png',
            url: 'https://cdn/poster.png',
            formats: { thumbnail: { url: 'https://cdn/poster-thumbnail.png' } },
          },
        }],
      },
    } as any)
    const zip = await JSZip.loadAsync(await file!.arrayBuffer())
    const paths = Object.keys(zip.files)

    expect(paths).toEqual(expect.arrayContaining([
      '163910-tiger/manifest.json',
      '163910-tiger/design.json',
      '163910-tiger/config/config.json',
      '163910-tiger/marketing/social/101-poster/original.png',
      '163910-tiger/marketing/social/101-poster/thumbnail.png',
    ]))
    expect(zip.files['163910-tiger/assets/background/']).toBeUndefined()
    expect(zip.files['163910-tiger/marketing/hero/']).toBeUndefined()
    expect(zip.files['163910-tiger/marketing/raw/']).toBeUndefined()
    expect(zip.files['163910-tiger/marketing/banner/']).toBeUndefined()
    expect(zip.files['163910-tiger/marketing/product/']).toBeUndefined()
    const manifest = JSON.parse(await zip.file('163910-tiger/manifest.json')!.async('string'))
    expect(manifest.appId).toBe(163910)
    expect(manifest.productImages[0]).toMatchObject({ imageId: 101, relationId: 700, type: 'social' })
  })

  it('rejects weather designs when the required font is missing', async () => {
    setActivePinia(createPinia())
    getWeatherConditions.mockClear()
    const config = {
      version: '1', properties: {}, designId: 'design-1', name: 'Weather Font', textCase: 0,
      bitmapMode: false, orderIds: ['weather-1'],
      elements: [{
        id: 'weather-1', eleType: 'weather', iconUnicode: '101d',
        fontFamily: 'weather-font', fontSize: 36, fill: '#FFFFFF',
      }],
    }

    const { buildWrtDesignPackage } = await import('@/engine/services/designAssetBundleService')
    await expect(buildWrtDesignPackage(config as any)).rejects.toThrow('Missing font file: weather-font')
    expect(getWeatherConditions).not.toHaveBeenCalled()
  })
})

describe('visual theme assets', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('includes themed backgrounds, hands, and caps while downloading duplicate sources once', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() })
    const fetch = vi.fn(async (input: string | URL | Request) => new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20"><title>${String(input)}</title></svg>`,
      { status: 200, headers: { 'content-type': 'image/svg+xml' } },
    ))
    vi.stubGlobal('fetch', fetch)
    const config = {
      version: '1', properties: {}, designId: 'design-1', name: 'Themes', textCase: 0,
      bitmapMode: false, orderIds: [], elements: [],
      visualThemes: {
        version: 1, enabled: true, defaultThemeId: 'classic', selectionMode: 'user',
        themes: [{
          id: 'classic', name: 'Classic',
          assets: {
            background: { assetId: 9, imageUrl: 'https://cdn/theme-background.svg' },
            hourHand: { assetId: 11, imageUrl: 'https://cdn/shared-hand.svg' },
            minuteHand: { assetId: 11, imageUrl: 'https://cdn/shared-hand.svg' },
            centerCap: { assetId: 12, imageUrl: 'https://cdn/cap.svg', targetSize: 24 },
          },
        }],
      },
    }

    const { buildWrtDesignPackage } = await import('@/engine/services/designAssetBundleService')
    const file = await buildWrtDesignPackage(config as any)
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
    const savedConfig = JSON.parse(await zip.file('config/config.json')!.async('string'))

    expect(manifest.assets.background).toHaveLength(1)
    expect(manifest.assets.hands).toHaveLength(2)
    expect(manifest.studio.assetRefs).toEqual(expect.arrayContaining([
      expect.objectContaining({ elementId: 'theme-classic-background', field: 'background' }),
      expect.objectContaining({ elementId: 'theme-classic-hourHand', field: 'hourHand' }),
      expect.objectContaining({ elementId: 'theme-classic-minuteHand', field: 'minuteHand' }),
      expect.objectContaining({ elementId: 'theme-classic-centerCap', field: 'centerCap' }),
    ]))
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(savedConfig.visualThemes.themes[0].assets.background.imageUrl.startsWith('bundle://')).toBe(true)
    expect(config.visualThemes.themes[0].assets.background.imageUrl).toBe('https://cdn/theme-background.svg')
  })

  it('restores themed asset URLs from the archive for designs without base elements', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      '<svg xmlns="http://www.w3.org/2000/svg"/>',
      { status: 200, headers: { 'content-type': 'image/svg+xml' } },
    )))
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:restored-theme'),
      revokeObjectURL: vi.fn(),
    })
    const config = {
      version: '1', properties: {}, designId: 'design-1', name: 'Themes', textCase: 0,
      bitmapMode: false, orderIds: [], elements: [],
      visualThemes: {
        version: 1, enabled: true, defaultThemeId: 'classic', selectionMode: 'user',
        themes: [{
          id: 'classic', name: 'Classic',
          assets: {
            hourHand: { assetId: 11, imageUrl: 'https://cdn/hour.svg' },
            minuteHand: { assetId: 12, imageUrl: 'https://cdn/minute.svg' },
          },
        }],
      },
    }
    const {
      buildWrtDesignPackage,
      restoreDesignAssetBundleFromZip,
    } = await import('@/engine/services/designAssetBundleService')
    const file = await buildWrtDesignPackage(config as any)
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))

    const restored = await restoreDesignAssetBundleFromZip(structuredClone(config) as any, zip, manifest)

    expect(restored.visualThemes!.themes[0].assets.hourHand).toEqual({
      assetId: 11,
      imageUrl: 'blob:restored-theme',
    })
  })

  it('registers one shared themed source in background and hands groups and restores both refs', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() })
    const fetch = vi.fn(async () => new Response(
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>',
      { status: 200, headers: { 'content-type': 'image/svg+xml' } },
    ))
    vi.stubGlobal('fetch', fetch)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:shared-restored'),
      revokeObjectURL: vi.fn(),
    })
    const sharedUrl = 'https://cdn.example/shared-theme.svg'
    const config = {
      version: '1', properties: {}, designId: 'design-1', name: 'Shared', textCase: 0,
      bitmapMode: false, orderIds: [], elements: [],
      visualThemes: {
        version: 1, enabled: true, defaultThemeId: 'classic', selectionMode: 'user',
        themes: [{
          id: 'classic', name: 'Classic',
          assets: {
            background: { assetId: 9, imageUrl: sharedUrl },
            hourHand: { assetId: 11, imageUrl: sharedUrl },
          },
        }],
      },
    }
    const {
      buildWrtDesignPackage,
      restoreDesignAssetBundleFromZip,
    } = await import('@/engine/services/designAssetBundleService')
    const file = await buildWrtDesignPackage(config as any)
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(manifest.assets.background).toHaveLength(1)
    expect(manifest.assets.hands).toEqual(manifest.assets.background)
    expect(manifest.studio.assetRefs).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'background', field: 'background' }),
      expect.objectContaining({ category: 'hands', field: 'hourHand' }),
    ]))

    const restored = await restoreDesignAssetBundleFromZip(structuredClone(config) as any, zip, manifest)
    expect(restored.visualThemes!.themes[0].assets.background?.imageUrl).toBe('blob:shared-restored')
    expect(restored.visualThemes!.themes[0].assets.hourHand?.imageUrl).toBe('blob:shared-restored')
  })
})

describe('self-contained WRT v2', () => {
  afterEach(async () => {
    vi.unstubAllGlobals()
    const registry = await import('./packageAssetRegistry')
    registry.packageFonts.clear()
    registry.packageFontBuildFiles.clear()
    registry.packageBitmapChars.clear()
  })

  it('imports and reexports images and font build bytes with HTTP unavailable', async () => {
    setActivePinia(createPinia())
    const service = await import('./designAssetBundleService')
    const registry = await import('./packageAssetRegistry')
    const nativeFetch = globalThis.fetch
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"/>'
    registry.packageFonts.set('offline-font', { slug: 'offline-font', ttfFile: { url: 'data:font/ttf;base64,AAEAAA==' } } as any)
    registry.packageFontBuildFiles.set('offline-font', new Map([
      ['36/offline-font-g.fnt', new Blob(['page id=0 file="offline-font-g_0.png"'])],
      ['36/offline-font-g_0.png', new Blob(['PNG'])],
    ]))
    const config = { designId: 'offline', name: 'Offline', elements: [{ id: 'image', eleType: 'image', imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`, fontFamily: 'offline-font', fontSize: 36 }], properties: { nested: { imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}` } } }
    const original = await service.buildWrtDesignPackage(config as any)
    registry.packageFonts.clear()
    registry.packageFontBuildFiles.clear()
    vi.stubGlobal('fetch', vi.fn((input: any, init?: any) => {
      if (/^https?:/.test(String(input))) throw new Error('Network disabled')
      return nativeFetch(input, init)
    }))
    const imported = await service.readWrtDesignPackage(original)
    expect((imported.config.elements[0] as any).imageUrl).toMatch(/^blob:/)
    expect((imported.config.properties as any).nested.imageUrl).toMatch(/^blob:/)
    expect(registry.packageFonts.get('offline-font')?.ttfFile.url).toMatch(/^blob:/)
    const exported = await service.buildWrtDesignPackage(imported.config)
    const zip = await JSZip.loadAsync(await exported.arrayBuffer())
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
    expect(manifest).toMatchObject({ version: 2, selfContained: true, failures: [] })
    expect(await zip.file('fonts/bitmaps/offline-font/36/offline-font-g.fnt')!.async('string')).toContain('page id=0')
    expect(await zip.file('design.json')!.async('string')).not.toContain('blob:')
    expect(manifest.fonts[0].sha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('preserves bitmap-only weather font previews without a TTF', async () => {
    setActivePinia(createPinia())
    const service = await import('./designAssetBundleService')
    const registry = await import('./packageAssetRegistry')
    registry.packageFonts.set('bitmap-weather', {
      slug: 'bitmap-weather', type: 'weather_font',
      bitmapPreviewDescriptorUrl: 'data:text/plain,page%20id=0',
      bitmapPreviewAtlasUrl: 'data:image/png;base64,iVBORw0KGgo=',
    } as any)
    registry.packageFontBuildFiles.set('bitmap-weather', new Map([
      ['36/bitmap-weather-g.fnt', new Blob(['page id=0 file="bitmap-weather-g_0.png"'])],
      ['36/bitmap-weather-g_0.png', new Blob(['PNG'])],
    ]))
    const file = await service.buildWrtDesignPackage({ elements: [{ eleType: 'weather', fontFamily: 'bitmap-weather', fontSize: 36 }] } as any)
    await service.readWrtDesignPackage(file)
    expect(registry.packageFonts.get('bitmap-weather')?.ttfFile).toBeUndefined()
    expect(registry.packageFonts.get('bitmap-weather')?.bitmapPreviewAtlasUrl).toMatch(/^blob:/)
    expect(registry.packageFontBuildFiles.get('bitmap-weather')?.size).toBe(2)
    await expect(service.buildWrtDesignPackage({ elements: [{ eleType: 'weather', fontFamily: 'bitmap-weather', fontSize: 36 }] } as any)).resolves.toBeInstanceOf(File)
  })

  it('saves and reopens weather previews from the font ZIP when preview CDN objects are denied', async () => {
    setActivePinia(createPinia())
    const service = await import('./designAssetBundleService')
    const registry = await import('./packageAssetRegistry')
    const slug = 'weather-preview-denied'
    const base = `https://cdn.wristo.io/font-bitmaps/${slug}/preview/v1-revision`
    const metadata = {
      slug, type: 'weather_font', bitmapPreviewSize: 30, bitmapCanvasPreviewSize: 312,
      bitmapPreviewDescriptorUrl: `${base}/30/${slug}-g.fnt`,
      bitmapPreviewAtlasUrl: `${base}/30/${slug}-g_0.png`,
      bitmapCanvasPreviewDescriptorUrl: `${base}/312/${slug}-g.fnt`,
      bitmapCanvasPreviewAtlasUrl: `${base}/312/${slug}-g_0.png`,
    }
    registry.packageFonts.set(slug, metadata as any)
    const fontZip = new JSZip()
    for (const size of [30, 312]) {
      fontZip.file(`${size}/${slug}-g.fnt`, `info size=${size}\npage id=0 file="${slug}-g_0.png"`)
      fontZip.file(`${size}/${slug}-g_0.png`, `PNG-${size}`)
    }
    const bytes = await fontZip.generateAsync({ type: 'arraybuffer' })
    const nativeFetch = globalThis.fetch
    vi.stubGlobal('fetch', vi.fn(async (input: any) => {
      const url = String(input)
      if (!/^https?:/.test(url)) return nativeFetch(input)
      return url.endsWith(`${slug}.zip`) ? new Response(bytes) : new Response('AccessDenied', { status: 403 })
    }))
    const file = await service.buildWrtDesignPackage({ elements: [{ eleType: 'weather', fontFamily: slug }] } as any)
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
    expect(manifest.failures).toEqual([])
    const atlasPath = manifest.fonts[0].metadata.bitmapCanvasPreviewAtlasUrl.replace('bundle://', '')
    expect(await zip.file(atlasPath)!.async('string')).toBe('PNG-312')
    expect(metadata.bitmapCanvasPreviewAtlasUrl).toBe(`${base}/312/${slug}-g_0.png`)
    const imported = await service.readWrtDesignPackage(file)
    expect(registry.packageFonts.get(slug)?.bitmapCanvasPreviewAtlasUrl).toMatch(/^blob:/)
    await expect(service.buildWrtDesignPackage(imported.config)).resolves.toBeInstanceOf(File)
  })

  it.each(['fnt', 'png'])('rejects inaccessible previews when the font ZIP is missing the %s half of the pair', async (missing) => {
    setActivePinia(createPinia())
    const service = await import('./designAssetBundleService')
    const registry = await import('./packageAssetRegistry')
    const slug = 'incomplete-weather-preview'
    const base = `https://cdn.wristo.io/font-bitmaps/${slug}/preview/v1-revision/312`
    registry.packageFonts.set(slug, {
      slug, bitmapPreviewDescriptorUrl: `${base}/${slug}-g.fnt`,
      bitmapPreviewAtlasUrl: `${base}/${slug}-g_0.png`,
    } as any)
    registry.packageFontBuildFiles.set(slug, new Map([
      [missing === 'fnt' ? `312/${slug}-g_0.png` : `312/${slug}-g.fnt`, new Blob(['incomplete'])],
    ]))
    vi.stubGlobal('fetch', vi.fn(async () => new Response('AccessDenied', { status: 403 })))
    await expect(service.buildWrtDesignPackage({ elements: [{ eleType: 'weather', fontFamily: slug }] } as any))
      .rejects.toThrow('Incomplete WRT')
  })

  it('cloud restoration uses the verified embedded design and rejects tampering', async () => {
    setActivePinia(createPinia())
    const service = await import('./designAssetBundleService')
    const file = await service.buildWrtDesignPackage({ name: 'Embedded', elements: [] } as any)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(await file.arrayBuffer())))
    expect((await service.restoreDesignAssetBundle({ name: 'Stale', elements: [] } as any, { assetBundleUrl: 'https://cdn/project.wrt' })).name).toBe('Embedded')
    expect((await service.restoreDesignAssetBundle({ name: 'Edited', elements: [] } as any, { assetBundleUrl: 'https://cdn/project.wrt', preserveConfig: true })).name).toBe('Edited')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('invalid zip')))
    await expect(service.restoreDesignAssetBundle({ elements: [] } as any, { assetBundleUrl: 'https://cdn/project.wrt' })).rejects.toThrow()
  })

  it('rejects image files that hide external dependencies in SVG content', async () => {
    setActivePinia(createPinia())
    const { buildWrtDesignPackage } = await import('./designAssetBundleService')
    const svg = '<svg><image href="https://cdn.example.com/image.png"/></svg>'
    await expect(buildWrtDesignPackage({ elements: [{ imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}` }] } as any)).rejects.toThrow('external dependency')
  })

  it('retains marketing images and preview when reexporting offline without options', async () => {
    setActivePinia(createPinia())
    const service = await import('./designAssetBundleService')
    const nativeFetch = globalThis.fetch
    const pixel = 'data:image/png;base64,iVBORw0KGgo='
    const original = await service.buildWrtDesignPackage({ name: 'Extras', elements: [] } as any, {
      previewDataUrl: pixel,
      product: { productImages: [{ id: 7, imageId: 7, type: 'social', image: { id: 7, name: 'Poster', url: pixel } }] } as any,
    })
    await service.readWrtDesignPackage(original)
    vi.stubGlobal('fetch', vi.fn((input: any, init?: any) => {
      if (/^https?:/.test(String(input))) throw new Error('Network disabled')
      return nativeFetch(input, init)
    }))
    const reexported = await service.buildWrtDesignPackage({ name: 'Extras', elements: [] } as any)
    const source = await JSZip.loadAsync(await original.arrayBuffer())
    const output = await JSZip.loadAsync(await reexported.arrayBuffer())
    const before = JSON.parse(await source.file('manifest.json')!.async('string'))
    const after = JSON.parse(await output.file('manifest.json')!.async('string'))
    expect(after.productImages).toEqual(before.productImages)
    expect(after.preview).toEqual(before.preview)
    for (const path of [after.preview.path, after.productImages[0].variants.original.path]) {
      expect(await output.file(path)!.async('base64')).toBe(await source.file(path)!.async('base64'))
    }
    expect(fetch).not.toHaveBeenCalled()
    const removed = await service.buildWrtDesignPackage({ name: 'Extras', elements: [] } as any, { product: {}, previewDataUrl: null })
    const removedZip = await JSZip.loadAsync(await removed.arrayBuffer())
    const removedManifest = JSON.parse(await removedZip.file('manifest.json')!.async('string'))
    expect(removedManifest.productImages).toEqual([])
    expect(removedManifest.preview.path).toBe('preview.svg')
  })

  it('rejects corrupt package bytes', async () => {
    setActivePinia(createPinia())
    const service = await import('./designAssetBundleService')
    const file = await service.buildWrtDesignPackage({ name: 'Hash', elements: [{ imageUrl: 'data:image/svg+xml,%3Csvg/%3E' }] } as any)
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
    zip.file(manifest.studio.assetRefs[0].path, 'tampered')
    const corrupt = new File([await zip.generateAsync({ type: 'arraybuffer' })], 'corrupt.wrt')
    await expect(service.readWrtDesignPackage(corrupt)).rejects.toThrow('Missing or corrupt package asset')
  })

  it('still reads legacy v1 packages', async () => {
    setActivePinia(createPinia())
    const zip = new JSZip()
    zip.file('manifest.json', JSON.stringify({ version: 1, format: 'wristo-design-package', design: { path: 'design.json' } }))
    zip.file('design.json', JSON.stringify({ name: 'Legacy', elements: [] }))
    const { readWrtDesignPackage } = await import('./designAssetBundleService')
    expect((await readWrtDesignPackage(new File([await zip.generateAsync({ type: 'arraybuffer' })], 'legacy.wrt'))).sourceName).toBe('Legacy')
  })
})
