import { defineStore } from 'pinia'
import { useBaseStore } from './baseStore'
import type { LayerElement } from '@/types/layer'
import { FabricElement } from '@/types/element'

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
    allLayers: (state): LayerElement[] => {
      return state.layers
    }
  },
  // actions
  actions: {
    addLayer(element: FabricElement): void {
      if (!element || !element.id || !element.eleType) {
        console.error('无效的元素')
        return
      }
      const layerElement: LayerElement = {
        id: element.id,
        visible: true,
        locked: false,
        selectable: true,
        eleType: element.eleType,
        element: element
      }
      this.layers.push(layerElement)
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
      const layer = this.layers.find((l) => l.id === layerId)
      if (layer) {
        layer.locked = !layer.locked
        layer.selectable = !layer.locked
        if (layer.locked) {
          layer.element?.set?.('active', false)
          this.baseStore.canvas?.discardActiveObject?.()
          this.baseStore.canvas?.renderAll?.()
        }
      }
    }
  }
})
