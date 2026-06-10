import { defineStore } from 'pinia'
import { useBaseStore } from './baseStore'
import { markRaw } from 'vue'
import type { LayerElement } from '@/types/layer'
import type { MinimalFabricLike } from '@/types/layer'

export const useLayerStore = defineStore('layerStore', {
  // state
  state: () => {
    const baseStore = useBaseStore()
    return {
      baseStore,
      layers: [] as LayerElement[], // all layers
      selectedLayerIds: [] as string[] // currently selected layer ids, synced with canvas selection
    }
  },

  getters: {
    allLayers: (state): LayerElement[] => {
      return state.layers
    },
    isSelected: (state) => {
      return (id: string): boolean => state.selectedLayerIds.includes(id)
    }
  },

  actions: {
    addLayer(element: MinimalFabricLike): void {
      if (!element || !element.id || !element.eleType) {
        console.error('[LayerStore:addLayer] 无效的元素', {
          hasElement: !!element,
          id: (element as any)?.id,
          eleType: (element as any)?.eleType,
        })
        return
      }
      const id = String(element.id)
      const existing = this.layers.find((l) => l.id === id)
      if (existing) {
        existing.eleType = element.eleType
        existing.element = markRaw(element)
        return
      }

      const layerElement: LayerElement = {
        id,
        visible: true,
        locked: false,
        selectable: true,
        eleType: element.eleType,
        element: markRaw(element),
      }
      this.layers.push(layerElement)
    },

    setLayers(nextLayers: LayerElement[]): void {
      this.layers = nextLayers.map((l) => ({
        ...l,
        element: markRaw(l.element),
      }))
    },

    removeLayer(layerId: string): void {
      const index = this.layers.findIndex((layer) => layer.id === layerId)
      if (index > -1) {
        this.layers.splice(index, 1)
      }
      this.selectedLayerIds = this.selectedLayerIds.filter((id) => id !== layerId)
    },

    toggleLayerVisibility(layerId: string): void {
      const element = this.layers.find((l) => l.id === layerId)
      if (element) {
        element.visible = !element.visible
        // sync to Fabric object
        if (element.element) {
          if (typeof element.element.set === 'function') {
            element.element.set({ visible: element.visible })
          } else {
            // fallback
            ;(element.element as unknown as { visible?: boolean }).visible = element.visible
          }
        }
        this.baseStore.canvas?.renderAll?.()
      }
    },
    toggleLayerLock(layerId: string): void {
      const layer = this.layers.find((l) => l.id === layerId)
      if (layer) {
      
        layer.locked = !layer.locked
        layer.selectable = !layer.locked
        // sync to Fabric object to actually disable selection / events
        if (layer.element) {
          if (String(layer.eleType ?? '') === 'background') {
            ;(layer.element as unknown as { wristoLayerLockOverridden?: boolean }).wristoLayerLockOverridden = true
          }
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
  },
  persist: {
    storage: localStorage,
    pick: ['layers', 'selectedLayerIds']
  }
})
