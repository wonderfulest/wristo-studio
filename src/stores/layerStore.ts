import { defineStore } from 'pinia'
import { useBaseStore } from './baseStore'
import type { LayerElement } from '@/types/layer'
import type { MinimalFabricLike } from '@/types/layer'
import { debug } from '@/utils/logger'

export const useLayerStore = defineStore('layerStore', {
  // state
  state: () => {
    const baseStore = useBaseStore()
    return {
      baseStore,
      layers: [] as LayerElement[],
      // currently selected layer ids, synced with canvas selection
      selectedLayerIds: [] as string[]
    }
  },

  // getters
  getters: {
    allLayers: (state): LayerElement[] => {
      return state.layers
    },
    isSelected: (state) => {
      return (id: string): boolean => state.selectedLayerIds.includes(id)
    }
  },
  // actions
  actions: {
    addLayer(element: MinimalFabricLike): void {
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
      // also remove from selection
      this.selectedLayerIds = this.selectedLayerIds.filter((id) => id !== layerId)
    },
    toggleLayerVisibility(layerId: string): void {
      debug('LayerStore', 'toggleLayerVisibility: start', { layerId })
      const element = this.layers.find((l) => l.id === layerId)
      if (element) {
        element.visible = !element.visible
        // sync to Fabric object
        if (element.element) {
          if (typeof element.element.set === 'function') {
            element.element.set('visible', element.visible)
            // also mirror to custom property for panel rendering if needed
            element.element.set('visible', element.visible)
          } else {
            // fallback
            ;(element.element as unknown as { visible?: boolean }).visible = element.visible
          }
        }
        this.baseStore.canvas?.renderAll?.()
        debug('LayerStore', 'toggleLayerVisibility: done', {
          layerId,
          visible: element.visible
        })
      }
    },
    toggleLayerLock(layerId: string): void {
      debug('LayerStore', 'toggleLayerLock: start', { layerId })
      const layer = this.layers.find((l) => l.id === layerId)
      if (layer) {
        layer.locked = !layer.locked
        layer.selectable = !layer.locked
        // sync to Fabric object to actually disable selection / events
        if (layer.element) {
          if (typeof layer.element.set === 'function') {
            layer.element.set({
              selectable: layer.selectable,
              evented: layer.selectable,
              locked: layer.locked
            })
          } else {
            ;(layer.element as unknown as { selectable?: boolean; evented?: boolean }).selectable = layer.selectable
            ;(layer.element as unknown as { selectable?: boolean; evented?: boolean }).evented = layer.selectable
            ;(layer.element as unknown as { locked?: boolean }).locked = layer.locked
          }
        }
        if (layer.locked) {
          layer.element?.set?.('active', false)
          this.baseStore.canvas?.discardActiveObject?.()
          // if locked, make sure it is not selected
          this.selectedLayerIds = this.selectedLayerIds.filter((id) => id !== layerId)
        }
        this.baseStore.canvas?.renderAll?.()
        debug('LayerStore', 'toggleLayerLock: done', {
          layerId,
          locked: layer.locked,
          selectable: layer.selectable
        })
      }
    },
    // selection management
    setSelected(ids: string[]): void {
      // de-duplicate and keep only ids that exist in layers
      const set = new Set(ids)
      const validIds = this.layers
        .map((l) => l.id)
        .filter((id) => set.has(id))
      this.selectedLayerIds = [...new Set(validIds)]
    },
    selectOne(id: string): void {
      if (this.layers.some((l) => l.id === id)) {
        this.selectedLayerIds = [id]
      }
    },
    clearSelected(): void {
      this.selectedLayerIds = []
    }
  }
})
