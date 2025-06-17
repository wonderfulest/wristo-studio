import { defineStore } from 'pinia'
import { useBaseStore } from '../../baseStore'
import { useLayerStore } from '../../layerStore'
import { useBaseElementStore } from '../baseElement'
import { nanoid } from 'nanoid'
import { Circle } from 'fabric'

export const useCircleStore = defineStore('circleElement', {
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
        throw new Error('画布未初始化，无法添加圆形元素')
      }

      try {
        // 处理所有配置项，使用可选链操作符设置默认值
        const radius = Number(options.radius ?? 50)
        const fill = options.fill || '#FFFFFF'
        const stroke = options.stroke || '#000000'
        const strokeWidth = Number(options.strokeWidth ?? 0)
        const opacity = Number(options.opacity ?? 1)
        
        const circleOptions = {
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
          // 保存原始配置用于后续更新
          initialConfig: {
            radius,
            fill,
            stroke,
            strokeWidth,
            opacity
          }
        }

        const circle = new Circle(circleOptions)

        // 添加到画布
        this.baseStore.canvas.add(circle)
        this.layerStore.addLayer(circle)
        this.baseStore.canvas.renderAll()
        this.baseStore.canvas.setActiveObject(circle)

        return circle
      } catch (error) {
        console.error('创建圆形元素失败:', error)
        throw error
      }
    },

    updateElement(element, options = {}) {
      if (!element) return

      // 更新基本属性
      if (options.radius !== undefined) {
        element.set('radius', Number(options.radius))
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

      // 更新位置
      if (options.left !== undefined) {
        element.set('left', Number(options.left))
      }

      if (options.top !== undefined) {
        element.set('top', Number(options.top))
      }

      // 保存更新后的配置
      element.initialConfig = {
        radius: element.radius,
        fill: element.fill,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        opacity: element.opacity
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
        type: 'circle',
        x: Math.round(element.left),
        y: Math.round(element.top),
        radius: element.radius,
        fill: element.fill,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        opacity: element.opacity,
        originX: element.originX,
        originY: element.originY
      }
    },

    decodeConfig(config) {
      return {
        eleType: 'circle',
        left: config.x,
        top: config.y,
        radius: config.radius,
        fill: config.fill,
        stroke: config.stroke,
        strokeWidth: config.strokeWidth,
        opacity: config.opacity,
        originX: config.originX,
        originY: config.originY
      }
    }
  }
})
