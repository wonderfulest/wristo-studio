import { defineStore } from 'pinia'

export const useDesignStore = defineStore('design', {
  state: () => ({
    id: '' as string,
    watchFaceName: '' as string,
    textCase: 0 as number,
    labelLengthType: 1 as number,
    showUnit: false as boolean,
  }),

  actions: {
    setWatchFaceName(name: string): void {
      this.watchFaceName = name
    },
  },
})
