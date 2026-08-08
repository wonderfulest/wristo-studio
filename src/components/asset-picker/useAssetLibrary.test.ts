// @vitest-environment jsdom
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalogAssetVO, AnalogAssetType } from '@/types/api/analog-asset'
import { useAssetLibrary } from './useAssetLibrary'

const asset = (id: number, type: AnalogAssetType = 'image', favoriteWeight: number | null = null): AnalogAssetVO =>
  ({
    id,
    analogAssetType: type,
    favoriteWeight,
    file: { url: `https://cdn/${id}.svg`, previewUrl: `https://cdn/${id}.png`, name: `${id}.svg` }
  }) as AnalogAssetVO

describe('useAssetLibrary', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('resets and appends paginated assets', async () => {
    const page = vi
      .fn()
      .mockResolvedValueOnce({ data: { list: [asset(1)], total: 2 } })
      .mockResolvedValueOnce({ data: { list: [asset(2)], total: 2 } })
    const library = useAssetLibrary({ assetType: () => 'image', canViewAll: () => true, api: { page, setFavorite: vi.fn() } })

    await library.loadAssets(true)
    expect(library.assets.value.map((item) => item.id)).toEqual([1])
    expect(page).toHaveBeenLastCalledWith(expect.objectContaining({ pageNum: 1, pageSize: 48, scope: 'mine' }))

    await library.loadMore()
    expect(library.assets.value.map((item) => item.id)).toEqual([1, 2])
    expect(library.hasMore.value).toBe(false)
  })

  it('uses original URLs for hand-like assets and previews for images', () => {
    const handLibrary = useAssetLibrary({ assetType: () => 'hour', canViewAll: () => false })
    const imageLibrary = useAssetLibrary({ assetType: () => 'image', canViewAll: () => false })
    expect(handLibrary.getAssetUrl(asset(1, 'hour'))).toBe('https://cdn/1.svg')
    expect(imageLibrary.getAssetUrl(asset(1))).toBe('https://cdn/1.png')
  })

  it('sorts favorites first without mutating the source order', () => {
    const library = useAssetLibrary({ assetType: () => 'image', canViewAll: () => false })
    library.assets.value = [asset(1), asset(2, 'image', 20), asset(3, 'image', 10)]
    expect(library.sortedAssets.value.map((item) => item.id)).toEqual([2, 3, 1])
    expect(library.assets.value.map((item) => item.id)).toEqual([1, 2, 3])
  })

  it('rolls back optimistic favorite changes when the API fails', async () => {
    const source = asset(1)
    const onError = vi.fn()
    const library = useAssetLibrary({
      assetType: () => 'image',
      canViewAll: () => false,
      api: { page: vi.fn(), setFavorite: vi.fn().mockRejectedValue(new Error('failed')) },
      onError
    })
    library.assets.value = [source]

    await library.toggleFavoriteAsset(source)
    expect(source.favoriteWeight).toBeNull()
    expect(onError).toHaveBeenCalledOnce()
    expect(library.favoritingAssetIds.value.size).toBe(0)
  })
})
