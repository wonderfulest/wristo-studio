import { defineStore } from 'pinia'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { AnalogAssetType, AnalogAssetVO } from '@/types/api/analog-asset'
import type { HandOption } from '@/types/settings'

export interface AnalogAssetStoreState {
  assetsByType: Partial<Record<AnalogAssetType, AnalogAssetVO[]>>
  loadingByType: Partial<Record<AnalogAssetType, boolean>>
  loadedByType: Partial<Record<AnalogAssetType, boolean>>
}

export const useAnalogAssetStore = defineStore<'analogAssetStore', AnalogAssetStoreState, {
  getOptions(state: AnalogAssetStoreState): (type: AnalogAssetType) => HandOption[]
  getFirstUrl(state: AnalogAssetStoreState): (type: AnalogAssetType) => string | null
  getFirstId(state: AnalogAssetStoreState): (type: AnalogAssetType) => number | null
}, {
  loadAssets(type: AnalogAssetType): Promise<void>
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
          const url = asset.file?.previewUrl || asset.file?.url || ''
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
        return first.file?.previewUrl || first.file?.url || null
      },
      getFirstId: (state) => (type: AnalogAssetType): number | null => {
        const list = state.assetsByType[type] || []
        if (!list.length) return null
        return list[0].id;
      }
    },

    actions: {
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
