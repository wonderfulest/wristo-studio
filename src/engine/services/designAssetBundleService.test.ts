import JSZip from 'jszip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { getBundleAssetMimeType } from '@/engine/services/bundleAssetMime'

vi.mock('@/api/image', () => ({ findImageByUrl: vi.fn(async () => ({ data: null })) }))

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

describe('sub-dial pointer assets', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('deduplicates identical pointer content and records pivot metadata', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() })
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="80"><path d="M10 0V80"/></svg>'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(svg, {
      status: 200,
      headers: { 'content-type': 'image/svg+xml' },
    })))
    const pointer = {
      style: 'image', color: '#fff', width: 2, lengthRatio: 0.8, assetId: null,
      pivotX: 0.5, pivotY: 0.85, scale: 1, rotationOffset: 0, tintColor: null,
    }
    const config = {
      version: '1', properties: {}, designId: 'design-1', name: 'Sub dial', textCase: 0,
      bitmapMode: false, orderIds: ['one', 'two'],
      elements: [
        { id: 'one', eleType: 'subDial', pointer: { ...pointer, imageUrl: 'https://one/pointer.svg' } },
        { id: 'two', eleType: 'subDial', pointer: { ...pointer, imageUrl: 'https://two/pointer.svg' } },
      ],
    }

    const { buildWrtDesignPackage } = await import('@/engine/services/designAssetBundleService')
    const file = await buildWrtDesignPackage(config as any)
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
    const refs = manifest.studio.assetRefs.filter((asset: any) => asset.role === 'subDialPointer')

    expect(refs).toHaveLength(2)
    expect(new Set(refs.map((asset: any) => asset.path)).size).toBe(1)
    expect(refs[0]).toMatchObject({
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      width: 20,
      height: 80,
      pivotX: 0.5,
      pivotY: 0.85,
      mimeType: 'image/svg+xml',
    })
    expect(refs[0].path).toMatch(/^assets\/sub-dial-pointers\/[a-f0-9]{64}\.svg$/)
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
    expect(zip.files['163910-tiger/assets/weather/amoled/']).toBeUndefined()
    expect(zip.files['163910-tiger/marketing/hero/']).toBeUndefined()
    expect(zip.files['163910-tiger/marketing/raw/']).toBeUndefined()
    expect(zip.files['163910-tiger/marketing/banner/']).toBeUndefined()
    expect(zip.files['163910-tiger/marketing/product/']).toBeUndefined()
    const manifest = JSON.parse(await zip.file('163910-tiger/manifest.json')!.async('string'))
    expect(manifest.appId).toBe(163910)
    expect(manifest.productImages[0]).toMatchObject({ imageId: 101, relationId: 700, type: 'social' })
  })
})
