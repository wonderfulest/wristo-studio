import JSZip from 'jszip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { findImageByUrl } from '@/api/image'
import { addGalleryMarketingImage, addScalarMarketingImage } from './marketingAssetBundle'

vi.mock('@/api/image', () => ({ findImageByUrl: vi.fn() }))

describe('marketing asset bundle', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('creates only the populated directory and routes share images to social', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      new Blob(['image'], { type: 'image/png' }),
      { status: 200, headers: { 'content-type': 'image/png' } },
    )))
    const zip = new JSZip()
    const record = await addGalleryMarketingImage(zip, {
      relationId: 91,
      imageId: 101,
      type: 'share',
      name: 'poster.png',
      image: { id: 101, url: 'https://cdn/poster.png' },
    })

    expect(Object.keys(zip.files)).toContain('marketing/social/101-poster/original.png')
    expect(zip.files['marketing/hero/']).toBeUndefined()
    expect(zip.files['marketing/raw/']).toBeUndefined()
    expect(zip.files['marketing/banner/']).toBeUndefined()
    expect(zip.files['marketing/product/']).toBeUndefined()
    expect(record).toMatchObject({ imageId: 101, type: 'social', sourceType: 'share' })
  })

  it('downloads every backend variant for scalar marketing images', async () => {
    vi.mocked(findImageByUrl).mockResolvedValueOnce({
      data: {
        id: 201,
        url: 'https://cdn/hero-original.png',
        formats: {
          thumbnail: { url: 'https://cdn/hero-thumbnail.png' },
          medium: { url: 'https://cdn/hero-medium.png' },
          large: { url: 'https://cdn/hero-large.png' },
        },
      },
    } as any)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      new Blob(['image'], { type: 'image/png' }),
      { status: 200, headers: { 'content-type': 'image/png' } },
    )))

    const zip = new JSZip()
    const record = await addScalarMarketingImage(zip, {
      type: 'hero',
      source: 'https://cdn/hero-original.png',
    })

    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      'marketing/hero/original.png',
      'marketing/hero/thumbnail.png',
      'marketing/hero/medium.png',
      'marketing/hero/large.png',
    ]))
    expect(Object.keys(record!.variants)).toEqual(['original', 'thumbnail', 'medium', 'large'])
  })
})
