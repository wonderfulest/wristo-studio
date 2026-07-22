import JSZip from 'jszip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { findImageByUrl } from '@/api/image'
import { enumerateImageVariants, resolveBackendImageRecord, writeImageVariants } from './imageVariantBundle'

vi.mock('@/api/image', () => ({ findImageByUrl: vi.fn() }))

describe('image variant bundle', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('only treats a backend 404 as a missing image record', async () => {
    vi.mocked(findImageByUrl).mockRejectedValueOnce({ response: { status: 404 } })
    await expect(resolveBackendImageRecord('https://cdn/missing.png')).resolves.toBeNull()

    vi.mocked(findImageByUrl).mockRejectedValueOnce({ response: { status: 500 } })
    await expect(resolveBackendImageRecord('https://cdn/failing.png'))
      .rejects.toThrow('Failed to resolve backend image record')
  })

  it('enumerates original and every existing backend format', () => {
    expect(enumerateImageVariants({
      url: 'https://cdn/original.png',
      formats: {
        thumbnail: { url: 'https://cdn/thumbnail.png' },
        medium: { url: 'https://cdn/medium.png' },
        large: { url: 'https://cdn/large.png' },
      },
    }).map((item) => item.name)).toEqual(['original', 'thumbnail', 'medium', 'large'])
  })

  it('writes every declared variant with stable names', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(
      new Blob([url], { type: 'image/png' }),
      { status: 200, headers: { 'content-type': 'image/png' } },
    )))
    const zip = new JSZip()
    const variants = await writeImageVariants(zip, {
      imageId: 101,
      basePath: 'marketing/product/101-multi-device',
      image: {
        url: 'https://cdn/original.png',
        formats: { thumbnail: { url: 'https://cdn/thumbnail.png' } },
      },
    })

    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      'marketing/product/101-multi-device/original.png',
      'marketing/product/101-multi-device/thumbnail.png',
    ]))
    expect(variants.every((item) => /^[a-f0-9]{64}$/.test(item.sha256))).toBe(true)
  })

  it('rejects the package when a declared variant cannot be downloaded', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response('', {
      status: url.includes('medium') ? 500 : 200,
      headers: { 'content-type': 'image/png' },
    })))

    await expect(writeImageVariants(new JSZip(), {
      imageId: 101,
      basePath: 'marketing/product/101-image',
      image: {
        url: 'https://cdn/original.png',
        formats: { medium: { url: 'https://cdn/medium.png' } },
      },
    })).rejects.toThrow('image 101 variant medium')
  })
})
