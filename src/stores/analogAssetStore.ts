import { defineStore } from 'pinia'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { AnalogAssetType, AnalogAssetVO } from '@/types/api/analog-asset'
import type { HandOption } from '@/types/settings'

export interface AnalogAssetStoreState {
  assetsByType: Partial<Record<AnalogAssetType, AnalogAssetVO[]>>
  loadingByType: Partial<Record<AnalogAssetType, boolean>>
  loadedByType: Partial<Record<AnalogAssetType, boolean>>
}

const originalFirstAssetTypes = new Set<AnalogAssetType>(['hour', 'minute', 'second', 'center_cap', 'windDirection'])

function getRenderableAssetUrl(asset: AnalogAssetVO): string {
  if (originalFirstAssetTypes.has(asset.analogAssetType)) {
    return asset.file?.url || asset.file?.previewUrl || ''
  }
  return asset.file?.previewUrl || asset.file?.url || ''
}

export const useAnalogAssetStore = defineStore<'analogAssetStore', AnalogAssetStoreState, {
  getOptions(state: AnalogAssetStoreState): (type: AnalogAssetType) => HandOption[]
  getFirstUrl(state: AnalogAssetStoreState): (type: AnalogAssetType) => string | null
  getFirstId(state: AnalogAssetStoreState): (type: AnalogAssetType) => number | null
}, {
  loadAssets(type: AnalogAssetType): Promise<void>
  prependAsset(asset: AnalogAssetVO): void
  removeAsset(type: AnalogAssetType, id: number): void
}>(
  'analogAssetStore',
  {
    state: (): AnalogAssetStoreState => ({
      assetsByType: {},
      loadingByType: {},
      loadedByType: {},
    }),

    getters: {
      getOptions: (state) => (type: AnalogAssetType): HandOption[] => {
        const list = state.assetsByType[type] || []
        return list.map((asset) => {
          const url = getRenderableAssetUrl(asset)
          return {
            name: asset.file?.name || `${asset.analogAssetType}-${asset.id}`,
            url,
          }
        }).filter(opt => !!opt.url)
      },
      getFirstUrl: (state) => (type: AnalogAssetType): string | null => {
        const list = state.assetsByType[type] || []
        if (!list.length) return null
        const first = list[0]
        return getRenderableAssetUrl(first) || null
      },
      getFirstId: (state) => (type: AnalogAssetType): number | null => {
        const list = state.assetsByType[type] || []
        if (!list.length) return null
        return list[0].id;
      }
    },

    actions: {
      prependAsset(asset: AnalogAssetVO): void {
        if (!asset?.analogAssetType || !asset.id) return
        const type = asset.analogAssetType
        const list = this.assetsByType[type] || []
        this.assetsByType[type] = [
          asset,
          ...list.filter((item) => item.id !== asset.id),
        ]
        this.loadedByType[type] = true
      },

      removeAsset(type: AnalogAssetType, id: number): void {
        const list = this.assetsByType[type] || []
        this.assetsByType[type] = list.filter((asset) => asset.id !== id)
      },

      async loadAssets(type: AnalogAssetType): Promise<void> {
        if (this.loadingByType[type]) return
        try {
          this.loadingByType[type] = true
          const res = await analogAssetApi.page({
            pageNum: 1,
            pageSize: 100,
            analogAssetType: type,
            isActive: true,
            orderBy: 'createdAt:desc',
          })
          if (res.data) {
            this.assetsByType[type] = res.data.list || []
            this.loadedByType[type] = true
          }
        } catch (e) {
          console.error('Failed to load analog assets:', type, e)
        } finally {
          this.loadingByType[type] = false
        }
      },
    },
  },
)
