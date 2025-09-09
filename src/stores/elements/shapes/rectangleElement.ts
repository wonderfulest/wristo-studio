import { defineStore } from 'pinia'
import { useBaseStore } from '../../baseStore'
import { useLayerStore } from '../../layerStore'
import { useBaseElementStore } from '../baseElement'
import { nanoid } from 'nanoid'
import { Rect } from 'fabric'

interface RectangleOptions {
  width?: number | string
  height?: number | string
  fill?: string
  stroke?: string
  strokeWidth?: number | string
  opacity?: number | string
  borderRadius?: number | string
  left?: number | string
  top?: number | string
}

export const useRectangleStore = defineStore('rectangleElement', {
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
    async addElement(options: RectangleOptions = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add rectangle element')
      }

      try {
        const width = Number(options.width ?? 100)
        const height = Number(options.height ?? 100)
        const fill = options.fill || '#FFFFFF'
        const stroke = options.stroke || '#000000'
        const strokeWidth = Number(options.strokeWidth ?? 0)
        const opacity = Number(options.opacity ?? 1)
        const borderRadius = Number(options.borderRadius ?? 0)

        const rectOptions: any = {
          id: nanoid(),
          eleType: 'rectangle',
          left: Number(options.left) || 0,
          top: Number(options.top) || 0,
          width: width,
          height: height,
          fill: fill,
          stroke: stroke,
          strokeWidth: strokeWidth,
          opacity: opacity,
          rx: borderRadius,
          ry: borderRadius,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockScalingFlip: true,
          initialConfig: {
            width,
            height,
            fill,
            stroke,
            strokeWidth,
            opacity,
            borderRadius,
          },
        }

        const rectangle = new Rect(rectOptions)

        this.baseStore.canvas.add(rectangle as any)
        this.layerStore.addLayer(rectangle as any)
        this.baseStore.canvas.renderAll()
        this.baseStore.canvas.setActiveObject(rectangle as any)

        return rectangle
      } catch (error) {
        console.error('创建矩形元素失败:', error)
        throw error
      }
    },

    updateElement(element: any, options: RectangleOptions = {}) {
      if (!element) return

      if (options.width !== undefined) {
        element.set('width', Number(options.width))
      }

      if (options.height !== undefined) {
        element.set('height', Number(options.height))
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

      if (options.borderRadius !== undefined) {
        element.set({
          rx: Number(options.borderRadius),
          ry: Number(options.borderRadius),
        })
      }

      if (options.left !== undefined) {
        element.set('left', Number(options.left))
      }

      if (options.top !== undefined) {
        element.set('top', Number(options.top))
      }

      element.initialConfig = {
        width: element.width,
        height: element.height,
        fill: element.fill,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        opacity: element.opacity,
        borderRadius: element.rx,
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
        eleType: 'rectangle',
        id: element.id,
        left: Math.round(element.left),
        top: Math.round(element.top),
        width: element.width,
        height: element.height,
        fill: element.fill,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        opacity: element.opacity,
        borderRadius: element.rx,
        originX: element.originX,
        originY: element.originY,
      }
    },

    decodeConfig(config: any) {
      return {
        eleType: 'rectangle',
        left: config.left,
        top: config.top,
        width: config.width,
        height: config.height,
        fill: config.fill,
        stroke: config.stroke,
        strokeWidth: config.strokeWidth,
        opacity: config.opacity,
        borderRadius: config.borderRadius,
        originX: config.originX,
        originY: config.originY,
      }
    },
  },
})
