import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { nanoid } from 'nanoid'
import { Circle } from 'fabric'
import { registerElement } from '@/engine/registry/elementRegistry'
import type { ElementType } from '@/types/element'

export interface CircleOptions {
  radius?: number | string
  fill?: string
  stroke?: string
  strokeWidth?: number | string
  opacity?: number | string
  left?: number | string
  top?: number | string
}

type CircleWithMeta = Circle & {
  __circleScaleSyncAttached?: boolean
}

function attachCircleScaleSync(circle: Circle): void {
  const c = circle as CircleWithMeta
  if (c.__circleScaleSyncAttached) return
  c.__circleScaleSyncAttached = true

  circle.on('modified', () => {
    const radius = Number(circle.radius ?? 0)
    const sx = Number(circle.scaleX ?? 1)
    const sy = Number(circle.scaleY ?? 1)

    if (!radius || radius <= 0) return
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return
    if (Math.abs(sx - 1) < 0.0001 && Math.abs(sy - 1) < 0.0001) return

    const uniformScale = (sx + sy) / 2 || 1
    const nextRadius = Math.max(1, radius * uniformScale)

    circle.set({
      radius: nextRadius,
      scaleX: 1,
      scaleY: 1,
    } as any)

    circle.setCoords()

    // 同步更新 ElementDataStore 中的业务配置
    const idOnCircle = (circle as any).id
    if (idOnCircle) {
      const store = useElementDataStore()
      store.patchElement(String(idOnCircle), {
        left: circle.left as number,
        top: circle.top as number,
        radius: circle.radius as number,
        fill: circle.fill as string,
        stroke: circle.stroke as string,
        strokeWidth: circle.strokeWidth as number,
        opacity: circle.opacity as number,
      } as any)
    }

    circle.canvas?.requestRenderAll()
  })
}

export const useCircleStore = defineStore('circleElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()

    return {
      baseStore,
      layerStore,
    }
  },

  actions: {
    async addElement(options: CircleOptions = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add circle element')
      }

      try {
        const elementDataStore = useElementDataStore()
        const radius = Number(options.radius ?? 50)
        const fill = options.fill || '#FFFFFF'
        const stroke = options.stroke || '#000000'
        const strokeWidth = Number(options.strokeWidth ?? 0)
        const opacity = Number(options.opacity ?? 1)

        const id = nanoid()

        const circleOptions: any = {
          id,
          eleType: 'circle',
          left: Number(options.left) || 0,
          top: Number(options.top) || 0,
          radius: radius,
          fill: fill,
          stroke: stroke,
          strokeWidth: strokeWidth,
          opacity: opacity,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          initialConfig: {
            radius,
            fill,
            stroke,
            strokeWidth,
            opacity,
          },
        }

        const circle = new Circle(circleOptions)

        attachCircleScaleSync(circle)

        // 将业务配置写入 ElementDataStore，作为权威数据源之一
        elementDataStore.upsertElement({
          id: String(id),
          eleType: 'circle',
          left: circle.left,
          top: circle.top,
          radius: circle.radius,
          fill: circle.fill,
          stroke: circle.stroke,
          strokeWidth: circle.strokeWidth,
          opacity: circle.opacity,
          originX: circle.originX,
          originY: circle.originY,
        } as any)

        this.baseStore.canvas.add(circle as any)
        this.layerStore.addLayer(circle as any)
        this.baseStore.canvas.renderAll()
        this.baseStore.canvas.setActiveObject(circle as any)

        return circle
      } catch (error) {
        console.error('创建圆形元素失败:', error)
        throw error
      }
    },

    updateElement(element: any, options: CircleOptions = {}) {
      if (!element) return

      const elementDataStore = useElementDataStore()
      const id = (element as any).id

      if (options.radius !== undefined) {
        element.set('radius', Number(options.radius))
      }

      if (options.fill !== undefined) {
        element.set('fill', options.fill)
      }

      if (options.stroke !== undefined) {
        element.set('stroke', options.stroke)
        element.set('dirty', true)
      }

      if (options.strokeWidth !== undefined) {
        element.set('strokeWidth', Number(options.strokeWidth))
        element.set('dirty', true)
      }

      if (options.opacity !== undefined) {
        element.set('opacity', Number(options.opacity))
      }

      if (options.left !== undefined) {
        element.set('left', Number(options.left))
      }

      if (options.top !== undefined) {
        element.set('top', Number(options.top))
      }

      element.initialConfig = {
        radius: element.radius,
        fill: element.fill,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        opacity: element.opacity,
      }

      element.setCoords()
      element.dirty = true
      this.baseStore.canvas?.renderAll()

      if (id != null) {
        elementDataStore.patchElement(String(id), {
          left: element.left as number,
          top: element.top as number,
          radius: element.radius as number,
          fill: element.fill as string,
          stroke: element.stroke as string,
          strokeWidth: element.strokeWidth as number,
          opacity: element.opacity as number,
        } as any)
      }
    },

    encodeConfig(element: any) {
      if (!element) {
        throw new Error('无效的元素')
      }
      return {
        eleType: 'circle',
        id: element.id,
        left: Math.round(element.left),
        top: Math.round(element.top),
        radius: element.radius,
        fill: element.fill,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        opacity: element.opacity,
        originX: element.originX,
        originY: element.originY,
      }
    },

    decodeConfig(config: any) {
      return {
        eleType: 'circle',
        left: config.left,
        top: config.top,
        radius: config.radius,
        fill: config.fill,
        stroke: config.stroke,
        strokeWidth: config.strokeWidth,
        opacity: config.opacity,
        originX: config.originX,
        originY: config.originY,
      }
    },
  },
})
