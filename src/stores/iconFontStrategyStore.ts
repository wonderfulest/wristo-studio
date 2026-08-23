import { defineStore } from 'pinia'
import { hasIconFont } from '@/utils/elementUtils'
import type { FabricElement } from '@/types/element'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { applyCurrentElementBitmapFontPreview } from '@/composables/useGarminSystemFont'

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
      const elementDataStore = useElementDataStore()
      const objects: FabricElement[] = canvas.getObjects() as FabricElement[]
      for (const obj of objects) {
        if (hasIconFont(obj)) {
          if ('fontFamily' in obj) {
            ;(obj as any).set('fontFamily', slug)
          }
          ;(obj as any).assetFontFamily = slug
          if ((obj as any).eleType !== 'icon' || (obj as any).iconDisplayType !== 'amoled') {
            applyCurrentElementBitmapFontPreview(obj, {
              fontFamily: slug,
              fontSize: (obj as any).fontSize,
              fill: (obj as any).fill,
            }, (obj as any).text)
          }
          if ((obj as any).id != null) {
            elementDataStore.patchElement(String((obj as any).id), {
              fontFamily: slug,
              iconFont: slug,
            } as any)
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
      if (!element) return false
      ;(element as any).set?.({ fontSize: newSize, iconSize: newSize })
      const id = (element as any).id
      if (id != null) {
        useElementDataStore().patchElement(String(id), { fontSize: newSize, iconSize: newSize } as any)
      }
      useCanvasStore().canvas?.renderAll()
      return true
    }
  }
})
