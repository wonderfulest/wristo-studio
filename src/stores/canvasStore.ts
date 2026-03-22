import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { Circle, type Canvas } from 'fabric'
import { useDesignStore } from '@/stores/designStore'
import { createBackground } from '@/elements/decoration/background/background.renderer'
import type { BackgroundElementConfig } from '@/types/elements/background'

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
      void this.ensureFixedLayers()
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

    async ensureFixedLayers(): Promise<void> {
      if (!this.canvas) return

      this.ensureGlobalLayer()
      await this.ensureBackgroundLayer()
      this.enforceFixedLayerOrder()
      this.applyGlobalClipPath()

      this.canvas.requestRenderAll?.()
    },

    ensureGlobalLayer(): void {
      if (!this.canvas) return
      const c = this.canvas
      const existing = (c.getObjects?.() || []).find((o: AnyObject) => o && o.eleType === 'global') as AnyObject | undefined
      if (existing) {
        this.watchFaceCircle = markRaw(existing)
      } else {
        this.watchFaceCircle = markRaw(new Circle({
          id: 'global',
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

        c.add(this.watchFaceCircle as any)
      }

      try {
        c.moveObjectTo(this.watchFaceCircle as any, 0)
      } catch {
        // ignore
      }
    },

    async ensureBackgroundLayer(): Promise<void> {
      if (!this.canvas) return
      const c = this.canvas
      const existing = (c.getObjects?.() || []).find((o: AnyObject) => o && o.eleType === 'background') as AnyObject | undefined
      if (existing) return

      const config: BackgroundElementConfig = {
        id: '',
        eleType: 'background',
        left: Number(this.designStore.designSpec.centerX ?? 0),
        top: Number(this.designStore.designSpec.centerY ?? 0),
        originX: 'center' as any,
        originY: 'center' as any,
        imageUrl: '',
        imageId: null,
      }

      await createBackground(config)

      // 固定层默认不选中
      try {
        c.discardActiveObject?.()
      } catch {
        // ignore
      }
    },

    enforceFixedLayerOrder(): void {
      if (!this.canvas) return
      const c = this.canvas
      const globalObj = (c.getObjects?.() || []).find((o: AnyObject) => o && o.eleType === 'global')
      const bgObj = (c.getObjects?.() || []).find((o: AnyObject) => o && o.eleType === 'background')

      if (globalObj) {
        try {
          c.moveObjectTo(globalObj as any, 0)
        } catch {
          // ignore
        }
      }
      if (bgObj) {
        try {
          c.moveObjectTo(bgObj as any, globalObj ? 1 : 0)
        } catch {
          // ignore
        }
      }
    },

    applyGlobalClipPath(): void {
      if (!this.canvas || !this.watchFaceCircle) return
      try {
        this.canvas.set({
          clipPath: this.watchFaceCircle as any,
        })
      } catch {
        // ignore
      }
    },

    toggleTheme(): void {
      this.enforceFixedLayerOrder()
      this.applyGlobalClipPath()
      this.canvas?.requestRenderAll?.()
    },
  },
})
