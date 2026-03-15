import { defineStore } from 'pinia'
import { ElMessageBox } from 'element-plus'
import { hasIconFont } from '@/utils/elementUtils'
import type { FabricElement } from '@/types/element'
import { useCanvasStore } from '@/stores/canvasStore'

// 专门负责“全局图标字体 slug/size 策略”的 store，和字体资源加载的 fontStore 区分开。
export const useIconFontStrategyStore = defineStore('iconFontStrategy', {
  state: () => ({
    currentIconFontSlug: '' as string,
    currentIconFontSize: -1 as number,
  }),

  actions: {
    setIconFontSlug(slug: string): void {
      this.currentIconFontSlug = slug
    },

    setIconFontSize(size: number): void {
      this.currentIconFontSize = size
    },

    updateAllIconFont(slug: string): void {
      const canvas = useCanvasStore().canvas
      if (!canvas) return
      const objects: FabricElement[] = canvas.getObjects() as FabricElement[]
      for (const obj of objects) {
        if (hasIconFont(obj)) {
          if ('fontFamily' in obj) {
            ;(obj as any).set('fontFamily', slug)
          }
        }
      }
      this.currentIconFontSlug = slug
      canvas.renderAll()
    },

    updateAllIconFontSize(size: number): void {
      const canvas = useCanvasStore().canvas
      if (!canvas) return
      const objects: FabricElement[] = canvas.getObjects() as FabricElement[]
      for (const obj of objects) {
        if (hasIconFont(obj)) {
          if ('fontSize' in obj) {
            ;(obj as any).set('fontSize', size)
          }
        }
      }
      this.currentIconFontSize = size
      canvas.renderAll()
    },

    async requestUpdateIconFontSize(element: any, newSize: number): Promise<boolean> {
      const canvasStore = useCanvasStore()
      const canvas = canvasStore.canvas
      // Initialize global size if not set
      if (this.currentIconFontSize == null) {
        if (element && 'fontSize' in element) {
          ;(element as any).set('fontSize', newSize)
          this.currentIconFontSize = newSize
          canvas?.renderAll()
          return true
        }
        return false
      }
      // If same as current, just apply to the element
      if (this.currentIconFontSize === newSize) {
        if (element && 'fontSize' in element) {
          ;(element as any).set('fontSize', newSize)
          canvas?.renderAll()
          return true
        }
        return false
      }
      // Ask user to confirm updating all icons
      try {
        await ElMessageBox.confirm(
          `当前表盘只允许一个图标字体大小。是否将所有图标元素大小统一为 ${newSize}px?`,
          '统一图标字体大小',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        this.updateAllIconFontSize(newSize)
        return true
      } catch {
        if (element && 'fontSize' in element) {
          ;(element as any).set('fontSize', this.currentIconFontSize)
          canvas?.renderAll()
        }
        return false
      }
    },
  },
})
