import { defineStore } from 'pinia'
import { useCanvasStore } from '@/stores/canvasStore'

// 为了保持与 canvasStore 一致，这里使用宽松的 AnyObject 类型
// 后续如果需要可以提取到独立的类型定义中

type AnyObject = Record<string, any>

export const useBackgroundStore = defineStore('backgroundStore', {
  state: () => ({
    watchFaceCircle: null as AnyObject | null,
    backgroundImage: null as AnyObject | null,
  }),

  actions: {
    syncFromCanvas(): void {
      const canvasStore = useCanvasStore()
      this.watchFaceCircle = canvasStore.watchFaceCircle as AnyObject | null
      this.backgroundImage = canvasStore.backgroundImage as AnyObject | null
    },

    setBackgroundImageFromUrl(url: string | null, imageId?: number | null): void {
      const canvasStore = useCanvasStore()
      canvasStore.setBackgroundImageFromUrl(url, imageId)
      this.syncFromCanvas()
    },

    addBackground(): void {
      const canvasStore = useCanvasStore()
      canvasStore.addBackground()
      this.syncFromCanvas()
    },

    updateBackgroundElements(zoom?: number): void {
      const canvasStore = useCanvasStore()
      canvasStore.updateBackgroundElements(zoom)
      this.syncFromCanvas()
    },

    toggleTheme(): void {
      const canvasStore = useCanvasStore()
      canvasStore.toggleTheme()
      this.syncFromCanvas()
    },
  },
})
