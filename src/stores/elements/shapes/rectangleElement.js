import { defineStore } from 'pinia'
import { useBaseStore } from '../../baseStore'
import { useLayerStore } from '../../layerStore'
import { useBaseElementStore } from '../baseElement'
import { nanoid } from 'nanoid'
import { Rect } from 'fabric'

export const useRectangleStore = defineStore('rectangleElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    const baseElement = useBaseElementStore()

    return {
      baseStore,
      layerStore,
      baseElement
    }
  },

  actions: {
    async addElement(options = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('画布未初始化，无法添加矩形元素')
      }

      try {
        // 处理所有配置项，使用可选链操作符设置默认值
        const width = Number(options.width ?? 100)
        const height = Number(options.height ?? 100)
        const fill = options.fill || '#FFFFFF'
        const stroke = options.stroke || '#000000'
        const strokeWidth = Number(options.strokeWidth ?? 0)
        const opacity = Number(options.opacity ?? 1)
        const borderRadius = Number(options.borderRadius ?? 0)
        
        const rectOptions = {
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
          // 保存原始配置用于后续更新
          initialConfig: {
            width,
            height,
            fill,
            stroke,
            strokeWidth,
            opacity,
            borderRadius
          }
        }

        const rectangle = new Rect(rectOptions)

        // 添加到画布
        this.baseStore.canvas.add(rectangle)
        this.layerStore.addLayer(rectangle)
        this.baseStore.canvas.renderAll()
        this.baseStore.canvas.setActiveObject(rectangle)

        return rectangle
      } catch (error) {
        console.error('创建矩形元素失败:', error)
        throw error
      }
    },

    updateElement(element, options = {}) {
      if (!element) return

      // 更新基本属性
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
        // 强制重新渲染边框
        element.set('dirty', true)
      }

      if (options.strokeWidth !== undefined) {
        element.set('strokeWidth', Number(options.strokeWidth))
        // 强制重新渲染边框
        element.set('dirty', true)
      }

      if (options.opacity !== undefined) {
        element.set('opacity', Number(options.opacity))
      }

      if (options.borderRadius !== undefined) {
        element.set({
          rx: Number(options.borderRadius),
          ry: Number(options.borderRadius)
        })
      }

      // 更新位置
      if (options.left !== undefined) {
        element.set('left', Number(options.left))
      }

      if (options.top !== undefined) {
        element.set('top', Number(options.top))
      }

      // 保存更新后的配置
      element.initialConfig = {
        width: element.width,
        height: element.height,
        fill: element.fill,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        opacity: element.opacity,
        borderRadius: element.rx
      }

      // 强制重新计算坐标和渲染
      element.setCoords()
      element.dirty = true
      this.baseStore.canvas.renderAll()
    },

    encodeConfig(element) {
      if (!element) {
        throw new Error('无效的元素')
      }

      return {
        type: 'rectangle',
        x: Math.round(element.left),
        y: Math.round(element.top),
        width: element.width,
        height: element.height,
        fill: element.fill,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        opacity: element.opacity,
        borderRadius: element.rx,
        originX: element.originX,
        originY: element.originY
      }
    },

    decodeConfig(config) {
      return {
        eleType: 'rectangle',
        left: config.x,
        top: config.y,
        width: config.width,
        height: config.height,
        fill: config.fill,
        stroke: config.stroke,
        strokeWidth: config.strokeWidth,
        opacity: config.opacity,
        borderRadius: config.borderRadius,
        originX: config.originX,
        originY: config.originY
      }
    }
  }
})
