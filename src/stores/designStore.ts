import { defineStore } from 'pinia'

export type WatchShape = 'circle' | 'rectangle'

export interface DesignSpec {
  width: number
  height: number
  shape: WatchShape
}

export const useDesignStore = defineStore('design', {
  state: () => ({
    id: '' as string,
    watchFaceName: '' as string,
    watchSize: 454,
    designSpec: {
      width: 454,
      height: 454,
      centerX: 227,
      centerY: 227,
      shape: 'circle' as WatchShape,
    } as DesignSpec & { centerX: number; centerY: number },
  }),

  actions: {
    setWatchFaceName(name: string): void {
      this.watchFaceName = name
    },

    setDesignSize(width: number, height = width): void {
      const nextWidth = Math.max(64, Math.round(width))
      const nextHeight = Math.max(64, Math.round(height))

      this.watchSize = nextWidth
      this.designSpec.width = nextWidth
      this.designSpec.height = nextHeight
      this.designSpec.centerX = Math.round(nextWidth / 2)
      this.designSpec.centerY = Math.round(nextHeight / 2)
    },
  },
})
