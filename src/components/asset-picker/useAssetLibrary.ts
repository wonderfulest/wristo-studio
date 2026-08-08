import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { AnalogAssetType, AnalogAssetVO } from '@/types/api/analog-asset'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { isHandAssetType } from '@/utils/assetUploadValidation'

type AssetLibraryApi = Pick<typeof analogAssetApi, 'page' | 'setFavorite'>
type Translate = (key: string, params?: Record<string, string | number>) => string

export interface UseAssetLibraryOptions {
  assetType: () => AnalogAssetType
  canViewAll: () => boolean
  api?: AssetLibraryApi
  translate?: Translate
  onError?: (error: unknown) => void
}

export function useAssetLibrary(options: UseAssetLibraryOptions) {
  const api = options.api ?? analogAssetApi
  const analogAssetStore = useAnalogAssetStore()
  const t: Translate = options.translate ?? ((key) => key)
  const assets = ref<AnalogAssetVO[]>([])
  const loading = ref(false)
  const hasMore = ref(true)
  const pageNum = ref(1)
  const assetScope = ref<'mine' | 'all'>('mine')
  const favoritingAssetIds = ref<Set<number>>(new Set())
  const pageSize = 48

  const sortedAssets = computed(() => [...assets.value].sort((a, b) => Number(b.favoriteWeight || 0) - Number(a.favoriteWeight || 0)))

  const getAssetUrl = (asset: AnalogAssetVO): string | undefined => {
    const type = options.assetType()
    if (isHandAssetType(type) || type === 'center_cap' || type === 'windDirection') {
      return asset.file?.url || asset.file?.previewUrl
    }
    return asset.file?.previewUrl || asset.file?.url
  }

  const getOriginalAssetUrl = (asset: AnalogAssetVO): string | undefined => asset.file?.url

  const prependAsset = (asset: AnalogAssetVO): void => {
    assets.value = [asset, ...assets.value.filter((item) => item.id !== asset.id)]
  }

  const updateAsset = (updatedAsset: AnalogAssetVO): void => {
    const index = assets.value.findIndex((asset) => asset.id === updatedAsset.id)
    if (index < 0) return
    assets.value[index] = {
      ...assets.value[index],
      ...updatedAsset,
      file: updatedAsset.file || assets.value[index].file
    }
  }

  const removeAssets = (ids: number[]): void => {
    const idSet = new Set(ids)
    assets.value = assets.value.filter((asset) => !idSet.has(asset.id))
    ids.forEach((id) => analogAssetStore.removeAsset(options.assetType(), id))
  }

  const loadAssets = async (reset = false): Promise<void> => {
    if (loading.value) return
    if (reset) {
      pageNum.value = 1
      assets.value = []
      hasMore.value = true
    }
    loading.value = true
    try {
      const res = await api.page({
        pageNum: pageNum.value,
        pageSize,
        analogAssetType: options.assetType(),
        isActive: true,
        orderBy: 'createdAt:desc',
        scope: options.canViewAll() ? assetScope.value : 'mine'
      })
      if (res.data) {
        const next = res.data.list || []
        assets.value = reset ? next : [...assets.value, ...next]
        hasMore.value = assets.value.length < res.data.total
      }
    } catch (error) {
      options.onError?.(error)
      if (!options.onError) ElMessage.error(t('asset.loadFailed'))
    } finally {
      loading.value = false
    }
  }

  const loadMore = async (): Promise<void> => {
    if (loading.value || !hasMore.value) return
    pageNum.value += 1
    await loadAssets()
  }

  const handleGridScroll = (event: Event): void => {
    const target = event.currentTarget as HTMLElement | null
    if (!target || loading.value || !hasMore.value) return
    if (target.scrollHeight - target.scrollTop - target.clientHeight <= 120) void loadMore()
  }

  const refresh = (): Promise<void> => loadAssets(true)
  const handleScopeChange = (): Promise<void> => loadAssets(true)
  const isFavoriteAsset = (asset: AnalogAssetVO): boolean => Number(asset.favoriteWeight || 0) > 0
  const isFavoritingAsset = (id: number): boolean => favoritingAssetIds.value.has(id)

  const toggleFavoriteAsset = async (asset: AnalogAssetVO): Promise<void> => {
    if (isFavoritingAsset(asset.id)) return
    const nextFavorite = !isFavoriteAsset(asset)
    const previousWeight = asset.favoriteWeight
    asset.favoriteWeight = nextFavorite ? Math.floor(Date.now() / 1000) : null
    favoritingAssetIds.value = new Set([...favoritingAssetIds.value, asset.id])
    try {
      const res = await api.setFavorite(asset.id, nextFavorite)
      if (res.data) updateAsset(res.data)
    } catch (error) {
      asset.favoriteWeight = previousWeight
      options.onError?.(error)
      if (!options.onError) ElMessage.error(t('asset.favoriteFailed'))
    } finally {
      const next = new Set(favoritingAssetIds.value)
      next.delete(asset.id)
      favoritingAssetIds.value = next
    }
  }

  const triggerDownload = (url: string, filename: string, openInNewTab = false): void => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    if (openInNewTab) {
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
    }
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const downloadAsset = async (asset: AnalogAssetVO): Promise<void> => {
    const url = getOriginalAssetUrl(asset)
    if (!url) return
    const filename = asset.file?.name?.trim() || `asset-${asset.id}`
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Download failed with status ${response.status}`)
      const objectUrl = URL.createObjectURL(await response.blob())
      triggerDownload(objectUrl, filename)
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    } catch {
      triggerDownload(url, filename, true)
    }
  }

  return {
    assets,
    loading,
    hasMore,
    assetScope,
    sortedAssets,
    favoritingAssetIds,
    getAssetUrl,
    getOriginalAssetUrl,
    prependAsset,
    updateAsset,
    removeAssets,
    loadAssets,
    loadMore,
    handleGridScroll,
    refresh,
    handleScopeChange,
    isFavoriteAsset,
    isFavoritingAsset,
    toggleFavoriteAsset,
    downloadAsset
  }
}
