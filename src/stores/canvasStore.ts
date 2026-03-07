import { defineStore } from 'pinia'

export const useCanvasStore = defineStore('canvas', {
  state: () => ({
    activeIds: [] as string[],
  }),

  actions: {
    setActiveIds(ids: string[]) {
      this.activeIds = ids
    },

    clearActiveIds() {
      this.activeIds = []
    },
  },
})
