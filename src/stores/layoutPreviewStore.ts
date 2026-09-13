import { defineStore } from 'pinia'
import { useLayerStore } from './layerStore'
import { usePropertiesStore } from './properties'
import { useCanvasStore } from './canvasStore'
import { reflowAllLayoutGroups } from '@/engine/layout/studioLayoutController'

/** Preview overrides are deliberately excluded from properties and saved WRT data. */
export const useLayoutPreviewStore = defineStore('layoutPreview', {
  state: () => ({ values: {} as Record<string, number> }),
  actions: {
    pruneInvalidSelections() {
      const properties = usePropertiesStore().allProperties
      for (const [key, value] of Object.entries(this.values)) {
        if (properties[key]?.type !== 'layout' || !properties[key].options?.some(option => option.value === value)) delete this.values[key]
      }
    },
    select(key: string, value: number) {
      const property = usePropertiesStore().properties[key]
      if (property?.type !== 'layout' || !property.options?.some(option => option.value === value)) return
      useCanvasStore().canvas?.discardActiveObject?.()
      useCanvasStore().setActiveSelection([], [])
      this.values = { ...this.values, [key]: value }
      useLayerStore().applyPreviewVisibility()
      reflowAllLayoutGroups({ persistPositions: false })
    },
    reset() { this.values = {} },
  },
})
