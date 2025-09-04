import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Circle, Group } from 'fabric'
import { nanoid } from 'nanoid'
import type { GoalArcElementConfig } from '@/types/elements/goal'

export const useGoalArcStore = defineStore('goalArcElement', {
  state: () => ({
    baseStore: useBaseStore(),
    layerStore: useLayerStore(),
    elements: new Map<string, any>(),
    progressMap: new Map<string, number>(),
  }),

  actions: {
    addElement(config: GoalArcElementConfig) {
      const id = nanoid()
      const startAngle = config.startAngle
      const endAngle = config.endAngle
      const radius = config.radius
      const bgRadius = config.bgRadius || radius
      const strokeWidth = config.strokeWidth
      const bgStrokeWidth = config.bgStrokeWidth || strokeWidth
      const color = config.color
      const bgColor = config.bgColor
      const counterClockwise = !!config.counterClockwise
      const progress = config.progress || 0

      const bgRing: any = new Circle({
        radius: bgRadius,
        fill: 'transparent',
        stroke: bgColor,
        strokeWidth: bgStrokeWidth,
        startAngle: startAngle,
        endAngle: endAngle,
        id: id + '_bg',
        originX: 'center',
        originY: 'center',
        counterClockwise: false,
      })

      const mainRing: any = new Circle({
        radius: radius,
        fill: 'transparent',
        stroke: color,
        strokeWidth: strokeWidth,
        startAngle: startAngle,
        endAngle: this.getProgressAngle(startAngle, endAngle, counterClockwise, progress),
        id: id + '_main',
        originX: 'center',
        originY: 'center',
        counterClockwise: counterClockwise,
      })

      const size = Math.max((radius + strokeWidth / 2) * 2, (bgRadius + bgStrokeWidth / 2) * 2)

      const group: any = new Group([bgRing, mainRing], {
        left: config.left,
        top: config.top,
        width: size,
        height: size,
        id: id,
        eleType: 'goalArc',
        selectable: true,
        hasControls: true,
        hasBorders: true,
        originX: 'center',
        originY: 'center',
        goalProperty: config.goalProperty,
        startAngle: startAngle,
        endAngle: endAngle,
        counterClockwise: counterClockwise,
      } as any)

      group.setCoords()
      this.baseStore.canvas?.add(group)
      this.layerStore.addLayer(group)
      this.baseStore.canvas?.renderAll()
      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(group)

      this.elements.set(id, group)
      this.progressMap.set(id, progress)
    },

    getProgressAngle(startAngle: number, endAngle: number, counterClockwise: boolean, progress: number) {
      startAngle = ((startAngle % 360) + 360) % 360
      endAngle = ((endAngle % 360) + 360) % 360
      if (counterClockwise) {
        if (endAngle > startAngle) {
          endAngle -= 360
        }
        return startAngle + (endAngle - startAngle) * progress
      } else {
        if (endAngle < startAngle) {
          endAngle += 360
        }
        return startAngle + (endAngle - startAngle) * progress
      }
    },

    updateProgress(element: any, progress: number) {
      if (!this.baseStore.canvas) return
      const group: any = this.baseStore.canvas.getObjects().find((obj: any) => (obj as any).id === element.id)
      if (!group || !group.getObjects) return
      const objects = group.getObjects()
      const mainRing: any = objects.find((obj: any) => (obj as any).id === element.id + '_main')
      if (!mainRing) return
      const startAngle = element.startAngle
      const endAngle = element.endAngle
      const counterClockwise = element.counterClockwise
      const progressAngle = this.getProgressAngle(startAngle, endAngle, counterClockwise, progress)
      mainRing.set('endAngle', progressAngle)
      mainRing.set('counterClockwise', counterClockwise)
      this.baseStore.canvas.renderAll()
      this.progressMap.set(element.id, progress)
    },

    updateElement(element: any, options: Partial<GoalArcElementConfig> = {}) {
      if (!element || !element.getObjects) return
      const objects = element.getObjects()
      const mainRing: any = objects.find((obj: any) => (obj as any).id === element.id + '_main')
      const bgRing: any = objects.find((obj: any) => (obj as any).id === element.id + '_bg')
      if (!mainRing || !bgRing) return

      const bgRingOptions: any = {
        radius: options.bgRadius || bgRing.radius,
        strokeWidth: options.bgStrokeWidth || bgRing.strokeWidth,
        stroke: options.bgColor || bgRing.stroke,
        startAngle: options.startAngle || bgRing.startAngle,
        endAngle: options.endAngle || bgRing.endAngle,
        counterClockwise: options.counterClockwise !== undefined ? options.counterClockwise : bgRing.counterClockwise,
      }
      bgRing.set(bgRingOptions)

      const progress = options.progress !== undefined ? options.progress : this.progressMap.get(element.id)
      const progressAngle = this.getProgressAngle(
        options.startAngle || element.startAngle,
        options.endAngle || element.endAngle,
        options.counterClockwise !== undefined ? options.counterClockwise : element.counterClockwise,
        progress as number,
      )

      const mainRingOptions: any = {
        radius: options.radius || mainRing.radius,
        strokeWidth: options.strokeWidth || mainRing.strokeWidth,
        stroke: options.color || mainRing.stroke,
        startAngle: options.startAngle || mainRing.startAngle,
        endAngle: progressAngle,
        counterClockwise: options.counterClockwise !== undefined ? options.counterClockwise : mainRing.counterClockwise,
      }
      mainRing.set(mainRingOptions)

      const groupOptions: any = {
        left: options.left !== undefined ? options.left : element.left,
        top: options.top !== undefined ? options.top : element.top,
        startAngle: options.startAngle !== undefined ? options.startAngle : element.startAngle,
        endAngle: options.endAngle !== undefined ? options.endAngle : element.endAngle,
        counterClockwise: options.counterClockwise !== undefined ? options.counterClockwise : element.counterClockwise,
        goalProperty: options.goalProperty !== undefined ? options.goalProperty : element.goalProperty,
      }
      element.set(groupOptions)

      const size = Math.max((mainRing.radius + mainRing.strokeWidth / 2) * 2, (bgRing.radius + bgRing.strokeWidth / 2) * 2)
      element.set({ width: size, height: size })

      element.setCoords()
      mainRing.setCoords()
      bgRing.setCoords()
      this.baseStore.canvas?.requestRenderAll()

      if (options.progress !== undefined) {
        this.progressMap.set(element.id, options.progress)
      }
    },

    encodeConfig(element: any) {
      const mainRing: any = element.getObjects().find((obj: any) => (obj as any).id.endsWith('_main'))
      const bgRing: any = element.getObjects().find((obj: any) => (obj as any).id.endsWith('_bg'))
      if (!mainRing || !bgRing) {
        throw new Error('Invalid element')
      }
      return {
        eleType: 'goalArc',
        x: Math.round(element.left),
        y: Math.round(element.top),
        startAngle: element.startAngle,
        endAngle: element.endAngle,
        radius: mainRing.radius,
        bgRadius: bgRing.radius,
        strokeWidth: mainRing.strokeWidth,
        bgStrokeWidth: bgRing.strokeWidth,
        color: mainRing.stroke,
        bgColor: bgRing.stroke,
        counterClockwise: element.counterClockwise,
        goalProperty: element.goalProperty,
        progress: this.progressMap.get(element.id),
      }
    },

    decodeConfig(config: any): GoalArcElementConfig {
      return {
        eleType: 'goalArc' as any,
        left: config.x,
        top: config.y,
        startAngle: config.startAngle,
        endAngle: config.endAngle,
        radius: config.radius,
        bgRadius: config.bgRadius,
        strokeWidth: config.strokeWidth,
        bgStrokeWidth: config.bgStrokeWidth,
        color: config.color,
        bgColor: config.bgColor,
        counterClockwise: config.counterClockwise,
        goalProperty: config.goalProperty,
        progress: config.progress,
      } as any
    },
  },
})
