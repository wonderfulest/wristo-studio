import { defineStore } from 'pinia'
import { useBaseStore } from './baseStore'
import type { LayerElement } from '@/types/layer'

export const useLayerStore = defineStore('layerStore', {
  // state
  state: () => {
    const baseStore = useBaseStore()
    return {
      baseStore,
      layers: [] as LayerElement[]
    }
  },

  // getters
  getters: {
    allLayers: (state): LayerElement[] => state.layers
  },

  // actions
  actions: {
    addLayer(element: LayerElement): void {
      if (!element) {
        console.error('无效的元素')
        return
      }
      this.layers.push(element)
    },
    removeLayer(layerId: string): void {
      const index = this.layers.findIndex((layer) => layer.id === layerId)
      if (index > -1) {
        this.layers.splice(index, 1)
      }
    },
    toggleLayerVisibility(layerId: string): void {
      const element = this.layers.find((l) => l.id === layerId)
      if (element) {
        element.visible = !element.visible
      }
    },
    toggleLayerLock(layerId: string): void {
      console.log('toggle layer lock', layerId)
      const element = this.layers.find((l) => l.id === layerId)
      if (element) {
        element.locked = !element.locked
        element.selectable = !element.locked
        if (element.locked) {
          element.set?.('active', false)
          this.baseStore.canvas?.discardActiveObject?.()
          this.baseStore.canvas?.renderAll?.()
        }
      }
    }
  }
})
