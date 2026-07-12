import JSZip from 'jszip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { getBundleAssetMimeType } from '@/engine/services/bundleAssetMime'

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
