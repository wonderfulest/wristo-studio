import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/image', () => ({ findImageByUrl: vi.fn() }))

let shared: Record<string, any>

describe('shared marketing asset plan', () => {
  beforeAll(async () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() })
    shared = await import('./marketingAssetBundle') as Record<string, any>
  })

  it('maps product fields to the Studio marketing package contract', () => {
    expect(shared.createMarketingAssetInputs).toBeTypeOf('function')
    const inputs = shared.createMarketingAssetInputs({
      garminImageUrl: 'https://cdn/hero.png',
      rawImageUrl: 'https://cdn/raw.png',
      bannerImageUrl: 'https://cdn/banner.png',
      productImages: [
        { id: 91, imageId: 101, type: 'product', imageUrl: 'https://cdn/product.png' },
        { id: 92, imageId: 102, type: 'share', imageUrl: 'https://cdn/share.png' },
      ],
    })

    expect(inputs.scalars).toEqual([
      { type: 'hero', source: 'https://cdn/hero.png' },
      { type: 'raw', source: 'https://cdn/raw.png' },
      { type: 'banner', source: 'https://cdn/banner.png' },
    ])
    expect(inputs.gallery).toHaveLength(2)
  })

  it('uses the same paths and variant enumeration for Studio and local downloads', () => {
    expect(shared.createScalarMarketingAssetPlan).toBeTypeOf('function')
    expect(shared.createGalleryMarketingAssetPlan).toBeTypeOf('function')
    expect(shared.enumerateMarketingVariantSources).toBeTypeOf('function')
    const scalar = shared.createScalarMarketingAssetPlan(
      { type: 'hero', source: 'https://cdn/hero.png' },
      { id: 201, url: 'https://cdn/hero.png', formats: { thumbnail: { url: 'https://cdn/hero-thumb.png' } } },
    )
    const gallery = shared.createGalleryMarketingAssetPlan({
      id: 92,
      imageId: 102,
      type: 'share',
      imageUrl: 'https://cdn/share.png',
      image: { id: 102, name: 'Share Poster.png', url: 'https://cdn/share.png' },
    })

    expect(scalar).toMatchObject({ basePath: 'marketing/hero', imageId: 201, type: 'product' })
    expect(shared.enumerateMarketingVariantSources(scalar.image).map((item: any) => item.name))
      .toEqual(['original', 'thumbnail'])
    expect(gallery).toMatchObject({
      basePath: 'marketing/social/102-share-poster',
      imageId: 102,
      relationId: 92,
      type: 'social',
      sourceType: 'share',
    })
  })
})
