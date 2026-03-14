import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { Circle, FabricImage, type Canvas } from 'fabric'
import { useEditorStore } from '@/stores/editorStore'
import { useDesignStore } from '@/stores/designStore'

type AnyObject = Record<string, any>

/**
 * 当前 `canvas` 实例、zoom、对齐线开关、当前选中 id 等**画布全局状态**。
 */
export const useCanvasStore = defineStore('canvas', {
  state: () => {
    const designStore = useDesignStore()

    return {
      activeIds: [] as string[],
      canvas: null as Canvas | null,
      designStore,
      watchFaceCircle: null as AnyObject | null,
      backgroundImage: null as AnyObject | null,
    }
  },

  actions: {
    setActiveIds(ids: string[]) {
      this.activeIds = ids
    },

    clearActiveIds() {
      this.activeIds = []
    },

    setCanvas(fabricCanvas: AnyObject): void {
      this.canvas = markRaw(fabricCanvas as Canvas)
      ;(window as any).__wristoCanvas = this.canvas
      if (!this.canvas) return
      this.canvas.renderOnAddRemove = false
      this.addBackground()
    },

    getObjects(): AnyObject[] {
      return this.canvas ? (this.canvas.getObjects() as AnyObject[]) : []
    },

    getActiveObjects(): AnyObject[] {
      if (!this.canvas) return []
      return this.canvas.getActiveObjects() as AnyObject[]
    },

    deactivateObject(): void {
      if (!this.canvas) return
      if (this.canvas.getActiveObjects().length > 0) {
        for (const _ of this.canvas.getActiveObjects()) {
          this.canvas.discardActiveObject()
        }
      }
    },

    setBackgroundImageFromUrl(url: string | null, imageId?: number | null): void {
      if (!this.canvas) return

      if (this.backgroundImage) {
        try {
          this.canvas.remove(this.backgroundImage as any)
        } catch (e) {
          console.warn('Failed to remove previous background image', e)
        }
        this.backgroundImage = null
      }

      if (!url) {
        this.canvas.renderAll()
        return
      }
      FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img: AnyObject) => {
        if (!img || !this.canvas) return
        const c = this.canvas
        const scale = this.designStore.designSpec.width / Math.min(img.width, img.height)
        this.backgroundImage = img
        img.set({
          eleType: 'background',
          scaleX: scale,
          scaleY: scale,
          left: this.designStore.designSpec.centerX,
          top: this.designStore.designSpec.centerY,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
          wristoImageId: imageId ?? null,
          wristoImageUrl: url,
        }) as any

        if (!c.getObjects().includes(img as any)) {
          c.add(img as any)
        }

        if (this.watchFaceCircle && c.getObjects().includes(this.watchFaceCircle as any)) {
          const globalIndex = c.getObjects().indexOf(this.watchFaceCircle as any)
          const targetIndex = globalIndex >= 0 ? globalIndex + 1 : 1
          c.moveObjectTo(this.watchFaceCircle as any, 0)
          c.moveObjectTo(img as any, targetIndex)
        } else {
          c.moveObjectTo(img as any, 0)
        }

        // 确保整个画布使用表盘圆进行裁剪
        if (this.watchFaceCircle) {
          c.set({
            clipPath: this.watchFaceCircle as any,
          })
        }

        c.renderAll()
      })
    },

    addBackground(): void {
      if (!this.canvas) return

      this.watchFaceCircle = markRaw(new Circle({
        eleType: 'global',
        left: this.designStore.designSpec.centerX,
        top: this.designStore.designSpec.centerY,
        originX: 'center',
        originY: 'center',
        radius: this.designStore.designSpec.centerX,
        fill: '#000000',
        backgroundColor: 'transparent',
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        hasBorders: false,
        hasControls: false,
      })) as unknown as AnyObject

      if (!this.canvas.getObjects().includes(this.watchFaceCircle as any)) {
        this.canvas.add(this.watchFaceCircle as any)
      }
      this.canvas.moveObjectTo(this.watchFaceCircle as any, 0)

      if (this.backgroundImage) {
        const img = this.backgroundImage
        const scale = this.designStore.designSpec.width / Math.min(img.width, img.height)
        img.set({
          eleType: 'background',
          scaleX: scale,
          scaleY: scale,
          left: this.designStore.designSpec.centerX,
          top: this.designStore.designSpec.centerY,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        })
        if (!this.canvas.getObjects().includes(img as any)) {
          this.canvas.add(img as any)
        }
        const globalIndex = this.canvas.getObjects().indexOf(this.watchFaceCircle as any)
        const targetIndex = globalIndex >= 0 ? globalIndex + 1 : 1
        this.canvas.moveObjectTo(img as any, targetIndex)
      }
    },

    updateBackgroundElements(zoom?: number): void {
      const editorStore = useEditorStore()
      if (zoom && zoom !== editorStore.zoomLevel) {
        editorStore.updateSetting('zoomLevel', zoom)
      }
      if (this.watchFaceCircle) {
        this.watchFaceCircle.set({
          left: this.designStore.designSpec.centerX,
          top: this.designStore.designSpec.centerY,
          originX: 'center',
          originY: 'center',
          radius: this.designStore.designSpec.centerX,
          strokeUniform: true,
          strokeWidth: 1,
          selectable: false,
          evented: false,
          hasBorders: false,
          hasControls: false,
          backgroundColor: 'transparent',
        })
        this.watchFaceCircle.setCoords()
      }

      if (this.backgroundImage) {
        const scale = this.designStore.designSpec.width / Math.min(this.backgroundImage.width, this.backgroundImage.height)
        this.backgroundImage.set({
          left: this.designStore.designSpec.centerX,
          top: this.designStore.designSpec.centerY,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          strokeUniform: true,
          selectable: false,
          evented: false,
        })
        this.backgroundImage.setCoords()
      }
    },

    toggleThemeBackground(): void {
      if (!this.canvas || !this.watchFaceCircle) {
        console.warn('画布不存在')
        return
      }

      const objects = this.canvas.getObjects() as AnyObject[]

      const watchFace = objects.find((obj: AnyObject) => obj.eleType === 'global')
      const oldBgImage = objects.find((obj: AnyObject) => obj.eleType === 'background')
      if (oldBgImage) {
        this.canvas.remove(oldBgImage as any)
      }

      if (this.backgroundImage) {
        const img = this.backgroundImage
        const scale = this.designStore.designSpec.centerX / Math.min(img.width, img.height)
        const left = this.designStore.designSpec.centerX - img.width * scale / 2
        const top = this.designStore.designSpec.centerY  - img.height * scale / 2

        img.set({
          scaleX: scale,
          scaleY: scale,
          left,
          top,
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
        }) as any

        if (!this.canvas.getObjects().includes(img as any)) {
          this.canvas.add(img as any)
        }
        this.canvas.moveObjectTo(img as any, 1)

        if (watchFace) {
          this.canvas.moveObjectTo(watchFace as any, 0)
        }
        this.canvas.set({
          clipPath: this.watchFaceCircle as any,
        })
        this.canvas.renderAll()
      } else if (watchFace) {
        this.canvas.moveObjectTo(watchFace as any, 0)
        this.canvas.set({
          clipPath: this.watchFaceCircle as any,
        })
        this.canvas.renderAll()
      }
    },

    toggleTheme(): void {
      this.toggleThemeBackground()
      this.canvas?.renderAll()
    },
  },
})
