import { defineStore } from 'pinia'
import { ElMessageBox } from 'element-plus'
import { hasIconFont } from '@/utils/elementUtils'
import type { FabricElement } from '@/types/element'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'

// 专门负责“全局图标字体 slug/size 策略”的 store，和字体资源加载的 fontStore 区分开。
export const useIconFontStrategyStore = defineStore('iconFontStrategy', {
  state: () => ({
    currentIconFontSlug: '' as string,
    currentIconFontSize: -1 as number
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
      const elementDataStore = useElementDataStore()
      const objects: FabricElement[] = canvas.getObjects() as FabricElement[]
      for (const obj of objects) {
        if (hasIconFont(obj)) {
          if ('fontSize' in obj) {
            ;(obj as any).set('fontSize', size)
          }
          ;(obj as any).set?.('iconSize', size)
          if ((obj as any).eleType === 'icon' && (obj as any).iconDisplayType === 'amoled') {
            ;(obj as any).scaleToWidth?.(Math.max(1, size))
            ;(obj as any).scaleToHeight?.(Math.max(1, size))
            ;(obj as any).set?.({
              amoledWidth: size,
              amoledHeight: size,
              width: (obj as any).width,
              height: (obj as any).height,
              hasControls: false,
              lockScalingX: true,
              lockScalingY: true
            })
          }
          if ((obj as any).id != null) {
            elementDataStore.patchElement(String((obj as any).id), {
              fontSize: size,
              iconSize: size,
              ...((obj as any).eleType === 'icon' && (obj as any).iconDisplayType === 'amoled'
                ? {
                    width: size,
                    height: size,
                    originX: 'center',
                    originY: 'center'
                  }
                : {})
            } as any)
          }
          ;(obj as any).setCoords?.()
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
        await ElMessageBox.confirm(`当前表盘只允许一个图标字体大小。是否将所有图标元素大小统一为 ${newSize}px?`, '统一图标字体大小', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        this.updateAllIconFontSize(newSize)
        return true
      } catch {
        if (element && 'fontSize' in element) {
          ;(element as any).set('fontSize', this.currentIconFontSize)
          canvas?.renderAll()
        }
        return false
      }
    }
  }
})
