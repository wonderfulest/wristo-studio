import JSZip from 'jszip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildProductImageArchive,
  createProductImageDownloadEntries,
} from './productImageDownload'
import type { ProductImageItem } from '@/types/product'

const item = (overrides: Partial<ProductImageItem> = {}): ProductImageItem => ({
  id: 101,
  type: 'product',
  imageUrl: 'https://cdn.example/display.jpg',
  previewUrl: 'https://cdn.example/preview.jpg',
  downloadUrl: 'https://cdn.example/original.jpg',
  image: {
    id: 101,
    url: 'https://cdn.example/original.jpg',
    previewUrl: 'https://cdn.example/image-preview.jpg',
    formats: {
      thumbnail: { url: 'https://cdn.example/thumb.jpg', mime: 'image/jpeg' },
      medium: { url: 'https://cdn.example/medium.webp', mime: 'image/webp' },
    },
  },
  ...overrides,
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createProductImageDownloadEntries', () => {
  it('uses the declared thumbnail and normalizes share into the social folder', () => {
    expect(createProductImageDownloadEntries([item({ type: 'share' })], 'thumbnail')).toEqual([
      {
        url: 'https://cdn.example/thumb.jpg',
        path: 'social/01-101-thumbnail.jpg',
      },
    ])
  })

  it('uses downloadUrl for original mode', () => {
    expect(createProductImageDownloadEntries([item()], 'original')).toEqual([
      {
        url: 'https://cdn.example/original.jpg',
        path: 'product/01-101-original.jpg',
      },
    ])
  })

  it('includes every distinct backend size in all-sizes mode', () => {
    expect(createProductImageDownloadEntries([item()], 'all').map((entry) => entry.path)).toEqual([
      'product/01-101/original.jpg',
      'product/01-101/thumbnail.jpg',
      'product/01-101/medium.webp',
    ])
  })

  it('deduplicates format URLs within one image', () => {
    const image = item()
    image.image!.formats!.small = { url: 'https://cdn.example/thumb.jpg' }

    expect(createProductImageDownloadEntries([image], 'all')).toHaveLength(3)
  })

  it('uses documented thumbnail and original fallbacks', () => {
    const fallback = item({
      imageUrl: 'https://cdn.example/display.png',
      previewUrl: undefined,
      downloadUrl: undefined,
      image: undefined,
    })

    expect(createProductImageDownloadEntries([fallback], 'thumbnail')[0].url)
      .toBe('https://cdn.example/display.png')
    expect(createProductImageDownloadEntries([fallback], 'original')[0].url)
      .toBe('https://cdn.example/display.png')
  })
})

describe('buildProductImageArchive', () => {
  it('keeps successful files when another image fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(new Blob(['ok'], { type: 'image/jpeg' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 404 })))

    const result = await buildProductImageArchive(
      [
        item(),
        item({
          id: 102,
          type: 'social',
          downloadUrl: 'https://cdn.example/missing.jpg',
          image: undefined,
        }),
      ],
      'original',
    )

    expect(result).toMatchObject({ downloaded: 1, failed: 1 })
    expect(result.blob).toBeInstanceOf(Blob)
    const zip = await JSZip.loadAsync(await result.blob!.arrayBuffer())
    expect(Object.keys(zip.files)).toContain('product/01-101-original.jpg')
  })

  it('does not create an empty archive when every fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await expect(buildProductImageArchive([item()], 'original')).resolves.toEqual({
      blob: null,
      downloaded: 0,
      failed: 1,
    })
  })

  it('counts images without a usable URL as failed', async () => {
    const missing = item({
      imageUrl: '',
      previewUrl: undefined,
      downloadUrl: undefined,
      image: undefined,
    })

    await expect(buildProductImageArchive([missing], 'thumbnail')).resolves.toEqual({
      blob: null,
      downloaded: 0,
      failed: 1,
    })
  })
})
