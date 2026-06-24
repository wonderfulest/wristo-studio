import { defineStore } from 'pinia'

export type EditorLayoutWidthKey =
  | 'assetLibraryDrawer'
  | 'propertiesDrawer'
  | 'leftLayerPanel'
  | 'rightSettingsPanel'

type EditorLayoutWidths = Record<EditorLayoutWidthKey, number>

const defaultWidths: EditorLayoutWidths = {
  assetLibraryDrawer: 560,
  propertiesDrawer: 920,
  leftLayerPanel: 312,
  rightSettingsPanel: 460,
}

export const useEditorLayoutStore = defineStore('editorLayout', {
  state: () => ({
    widths: { ...defaultWidths } as EditorLayoutWidths,
  }),

  persist: {
    key: 'wristo-editor-layout',
    storage: localStorage,
  },

  actions: {
    getWidth(key: EditorLayoutWidthKey): number {
      return Number(this.widths[key] || defaultWidths[key])
    },

    setWidth(key: EditorLayoutWidthKey, width: number): void {
      const normalized = Math.round(Number(width))
      if (!Number.isFinite(normalized) || normalized <= 0) return
      this.widths[key] = normalized
    },

    resetWidth(key: EditorLayoutWidthKey): void {
      this.widths[key] = defaultWidths[key]
    },
  },
})
