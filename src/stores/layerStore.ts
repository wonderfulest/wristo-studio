import { defineStore } from 'pinia'
import { useBaseStore } from './baseStore'
import { markRaw } from 'vue'
import type { LayerElement } from '@/types/layer'
import type { MinimalFabricLike } from '@/types/layer'
import { useElementDataStore } from '@/stores/elementDataStore'
import {
  getDisplayState,
  normalizeDisplayStates,
  setDisplayState,
  type DisplayStateMode,
  type ElementDisplayStates,
} from '@/utils/displayStates'

export const useLayerStore = defineStore('layerStore', {
  // state
  state: () => {
    const baseStore = useBaseStore()
    return {
      baseStore,
      layers: [] as LayerElement[], // all layers
      previewMode: 'active' as DisplayStateMode,
      selectedLayerIds: [] as string[] // currently selected layer ids, synced with canvas selection
    }
  },

  getters: {
    allLayers: (state): LayerElement[] => {
      return state.layers
    },
    currentPreviewMode: (state): DisplayStateMode => {
      return state.previewMode
    },
    isSelected: (state) => {
      return (id: string): boolean => state.selectedLayerIds.includes(id)
    }
  },

  actions: {
    applyPreviewVisibility(): void {
      this.layers.forEach((layer) => {
        const displayStates = normalizeDisplayStates(layer.displayStates)
        layer.displayStates = displayStates
        layer.visible = String(layer.eleType ?? '') === 'background' && this.previewMode === 'ambient'
          ? false
          : getDisplayState(displayStates, this.previewMode)
        if (layer.element) {
          ;(layer.element as any).displayStates = displayStates
          if (typeof layer.element.set === 'function') {
            layer.element.set({ visible: layer.visible, displayStates })
          } else {
            ;(layer.element as any).visible = layer.visible
          }
        }
      })
      this.baseStore.canvas?.renderAll?.()
    },
    setPreviewMode(mode: DisplayStateMode): void {
      this.previewMode = mode
      this.applyPreviewVisibility()
    },
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
      const storedConfig = useElementDataStore().getElementConfig(id) as any
      const displayStates = normalizeDisplayStates((element as any).displayStates ?? storedConfig?.displayStates)
      ;(element as any).displayStates = displayStates
      const existing = this.layers.find((l) => l.id === id)
      if (existing) {
        existing.eleType = element.eleType
        existing.displayStates = displayStates
        existing.visible = getDisplayState(displayStates, this.previewMode)
        existing.element = markRaw(element)
        this.applyPreviewVisibility()
        return
      }

      const layerElement: LayerElement = {
        id,
        visible: getDisplayState(displayStates, this.previewMode),
        displayStates,
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
        displayStates: normalizeDisplayStates(l.displayStates ?? (l.element as any)?.displayStates),
        visible: getDisplayState(l.displayStates ?? (l.element as any)?.displayStates, this.previewMode),
        element: markRaw(l.element),
      }))
      this.applyPreviewVisibility()
    },

    removeLayer(layerId: string): void {
      const index = this.layers.findIndex((layer) => layer.id === layerId)
      if (index > -1) {
        this.layers.splice(index, 1)
      }
      this.selectedLayerIds = this.selectedLayerIds.filter((id) => id !== layerId)
    },

    setLayerDisplayStates(layerId: string, displayStates: ElementDisplayStates): void {
      const layer = this.layers.find((l) => l.id === layerId)
      if (!layer) return

      const normalized = normalizeDisplayStates(displayStates)
      layer.displayStates = normalized
      layer.visible = getDisplayState(normalized, this.previewMode)
      if (layer.element) {
        ;(layer.element as any).displayStates = normalized
        if (typeof layer.element.set === 'function') {
          layer.element.set({ visible: layer.visible, displayStates: normalized })
        } else {
          ;(layer.element as any).visible = layer.visible
        }
      }
      useElementDataStore().patchElement(layerId, { displayStates: normalized } as any)
      this.baseStore.canvas?.renderAll?.()
    },
    toggleLayerVisibility(layerId: string): void {
      const layer = this.layers.find((l) => l.id === layerId)
      if (!layer) return

      const next = setDisplayState(layer.displayStates, this.previewMode, !getDisplayState(layer.displayStates, this.previewMode))
      this.setLayerDisplayStates(layerId, next)
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
    pick: ['previewMode', 'selectedLayerIds']
  }
})
