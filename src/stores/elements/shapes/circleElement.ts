import { defineStore } from 'pinia'
import { useBaseStore } from '../../baseStore'
import { useLayerStore } from '../../layerStore'
import { useBaseElementStore } from '../baseElement'
import { nanoid } from 'nanoid'
import { Circle } from 'fabric'

interface CircleOptions {
  radius?: number | string
  fill?: string
  stroke?: string
  strokeWidth?: number | string
  opacity?: number | string
  left?: number | string
  top?: number | string
}

export const useCircleStore = defineStore('circleElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    const baseElement = useBaseElementStore()

    return {
      baseStore,
      layerStore,
      baseElement,
    }
  },

  actions: {
    async addElement(options: CircleOptions = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add circle element')
      }

      try {
        const radius = Number(options.radius ?? 50)
        const fill = options.fill || '#FFFFFF'
        const stroke = options.stroke || '#000000'
        const strokeWidth = Number(options.strokeWidth ?? 0)
        const opacity = Number(options.opacity ?? 1)

        const circleOptions: any = {
          id: nanoid(),
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
          hasBorders: true,
          lockScalingFlip: true,
          initialConfig: {
            radius,
            fill,
            stroke,
            strokeWidth,
            opacity,
          },
        }

        const circle = new Circle(circleOptions)

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
    },

    encodeConfig(element: any) {
      if (!element) {
        throw new Error('无效的元素')
      }
      return {
        eleType: 'circle',
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
