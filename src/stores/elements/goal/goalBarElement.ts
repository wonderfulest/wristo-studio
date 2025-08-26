import { defineStore } from 'pinia'
import { Rect, Group } from 'fabric'
import { nanoid } from 'nanoid'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import type { GoalBarElementConfig } from '@/types/elements/goal'

export const useGoalBarStore = defineStore('goalBarStore', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()

    return {
      goalBarElements: [] as any[],
      baseStore,
      layerStore,
    }
  },

  actions: {
    async addElement(options: GoalBarElementConfig = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas not initialized, cannot add goal bar element')
      }
      const padding = Number(options.padding ?? 2)
      const progressAlign = options.progressAlign || 'left'
      const borderWidth = Number(options.borderWidth ?? 0)
      const borderColor = options.borderColor || '#FFFFFF'

      const background: any = new Rect({
        id: `${nanoid()}_background`,
        left: Number(options.left) || 0,
        top: Number(options.top) || 0,
        width: Number(options.width) || 200,
        height: Number(options.height) || 10,
        fill: options.bgColor || '#333333',
        rx: Number(options.borderRadius) || 5,
        ry: Number(options.borderRadius) || 5,
        originX: 'center',
        originY: 'center',
        stroke: borderColor,
        strokeWidth: borderWidth,
      })

      const progress: any = new Rect({
        id: `${nanoid()}_progress`,
        left: this.getProgressLeft(background, padding, progressAlign, options.progress || 0),
        top: background.top,
        width: (background.width - padding * 2) * (options.progress || 0),
        height: background.height - padding * 2,
        fill: options.color || '#00FF00',
        rx: Math.max(0, background.rx - padding),
        ry: Math.max(0, background.ry - padding),
        originX: progressAlign,
        originY: 'center',
      })

      const group: any = new Group([background, progress], {
        id: nanoid(),
        eleType: 'goalBar',
        left: Number(options.left) || 0,
        top: Number(options.top) || 0,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        originX: 'center',
        originY: 'center',
        progress: options.progress || 0,
        color: options.color || '#00FF00',
        bgColor: options.bgColor || '#333333',
        borderRadius: Number(options.borderRadius) || 5,
        padding: padding,
        progressAlign: progressAlign,
        borderWidth: borderWidth,
        borderColor: borderColor,
        goalProperty: options.goalProperty || '',
      } as any)

      this.baseStore.canvas?.add(group)
      this.layerStore.addLayer(group)
      this.baseStore.canvas?.renderAll()
      this.baseStore.canvas?.setActiveObject(group)
      return group
    },

    getProgressLeft(background: any, padding: number, progressAlign: 'left' | 'right', progress: number) {
      switch (progressAlign) {
        case 'left':
          return background.left - background.width / 2 + padding
        case 'right':
          const rightEdge = background.left + background.width
          const progressWidth = (background.width - padding * 2) * progress
          return rightEdge - padding - progressWidth
        default:
          return background.left - background.width / 2 + padding
      }
    },

    updateElement(element: any, options: Partial<GoalBarElementConfig> = {}) {
      if (!element || !element.getObjects) return
      const objects = element.getObjects()
      const background: any = objects.find((obj: any) => (obj as any).id.endsWith('_background'))
      const progress: any = objects.find((obj: any) => (obj as any).id.endsWith('_progress'))
      if (!background || !progress) return

      const padding = options.padding !== undefined ? Number(options.padding) : (element.padding || 2)
      const progressAlign = options.progressAlign || element.progressAlign || 'left'

      if (options.borderWidth !== undefined || options.borderColor !== undefined) {
        const borderWidth = options.borderWidth !== undefined ? Number(options.borderWidth) : (element.borderWidth || 0)
        const borderColor = options.borderColor || element.borderColor || '#FFFFFF'
        element.borderWidth = borderWidth
        element.borderColor = borderColor
        background.set({ stroke: borderColor, strokeWidth: borderWidth })
      }

      if (options.width !== undefined) {
        background.set('width', options.width)
        progress.set('width', (options.width - padding * 2) * element.progress)
      }
      if (options.height !== undefined) {
        background.set('height', options.height)
        progress.set('height', options.height - padding * 2)
      }
      if (options.borderRadius !== undefined) {
        background.set({ rx: options.borderRadius, ry: options.borderRadius })
        progress.set({ rx: Math.max(0, (options.borderRadius || 0) - padding), ry: Math.max(0, (options.borderRadius || 0) - padding) })
      }

      if (options.padding !== undefined || options.progressAlign !== undefined) {
        element.padding = padding
        element.progressAlign = progressAlign
        progress.set({
          left: this.getProgressLeft(background, padding, progressAlign as any, element.progress),
          width: (background.width - padding * 2) * element.progress,
          height: background.height - padding * 2,
          rx: Math.max(0, background.rx - padding),
          ry: Math.max(0, background.ry - padding),
          originX: progressAlign,
        })
      }

      if (options.color !== undefined) {
        progress.set('fill', options.color)
        element.color = options.color
      }
      if (options.bgColor !== undefined) {
        background.set('fill', options.bgColor)
        element.bgColor = options.bgColor
      }
      if (options.progress !== undefined) {
        element.progress = options.progress
        progress.set({
          width: (background.width - padding * 2) * (options.progress || 0),
          left: this.getProgressLeft(background, padding, progressAlign as any, options.progress || 0),
        })
      }
      if (options.goalProperty !== undefined) {
        element.goalProperty = options.goalProperty
      }
      element.setCoords()
      this.baseStore.canvas?.renderAll()
    },

    encodeConfig(element: any) {
      if (!element) {
        throw new Error('Invalid element')
      }
      const objects = element.getObjects()
      const background: any = objects.find((obj: any) => (obj as any).id.endsWith('_background'))
      return {
        type: 'goalBar',
        x: element.left,
        y: element.top,
        width: background.width,
        height: background.height,
        color: element.color,
        bgColor: element.bgColor,
        borderRadius: element.borderRadius,
        progress: element.progress,
        padding: element.padding,
        originX: element.originX,
        originY: background.originY,
        borderWidth: element.borderWidth,
        borderColor: element.borderColor,
        goalProperty: element.goalProperty,
      }
    },

    decodeConfig(config: any): GoalBarElementConfig {
      return {
        eleType: 'goalBar' as any,
        left: config.x,
        top: config.y,
        width: config.width,
        height: config.height,
        color: config.color,
        bgColor: config.bgColor,
        borderRadius: config.borderRadius,
        progress: config.progress,
        padding: config.padding,
        originX: config.originX,
        originY: config.originY,
        borderWidth: config.borderWidth,
        borderColor: config.borderColor,
        goalProperty: config.goalProperty,
      } as any
    },
  },
})
