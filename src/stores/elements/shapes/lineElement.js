import { defineStore } from 'pinia'
import { useBaseStore } from '../../baseStore'
import { useLayerStore } from '../../layerStore'
import { useBaseElementStore } from '../baseElement'
import { nanoid } from 'nanoid'
import { Line } from 'fabric'

export const useLineElementStore = defineStore('lineElement', {
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
        throw new Error('画布未初始化，无法添加直线元素')
      }

      try {
        // 处理所有配置项，使用可选链操作符设置默认值
        const left = Number(options.left) || 227
        const top = Number(options.top) || 227
        const stroke = options.stroke || '#FFFFFF'
        const strokeWidth = Number(options.strokeWidth ?? 2)
        const opacity = Number(options.opacity ?? 1)
        
        const x1 = Number(options.x1 ?? 0)
        const y1 = Number(options.y1 ?? 0)
        const x2 = Number(options.x2 ?? 100)
        const y2 = Number(options.y2 ?? 0)

        const lineOptions = {
          id: nanoid(),
          eleType: 'line',
          left: left,
          top: top,
          x1: x1,
          y1: y1,
          x2: x2,
          y2: y2,
          stroke: stroke,
          strokeWidth: strokeWidth,
          strokeLineCap: options.strokeLineCap || 'round',
          strokeLineJoin: options.strokeLineJoin || 'round',
          opacity: opacity,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockScalingFlip: true,
          // 保存原始配置用于后续更新
          initialConfig: {
            stroke,
            strokeWidth,
            opacity,
            x1,
            y1,
            x2,
            y2,
            strokeLineCap: options.strokeLineCap || 'round',
            strokeLineJoin: options.strokeLineJoin || 'round'
          }
        }

        const line = new Line([x1, y1, x2, y2], lineOptions)

        // 添加到画布
        this.baseStore.canvas.add(line)
        this.layerStore.addLayer(line)
        this.baseStore.canvas.renderAll()
        this.baseStore.canvas.setActiveObject(line)

        return line
      } catch (error) {
        console.error('创建直线元素失败:', error)
        throw error
      }
    },

    updateElement(element, options = {}) {
      if (!element) return

      // 更新基本属性
      if (options.stroke !== undefined) {
        element.set('stroke', options.stroke)
      }

      if (options.strokeWidth !== undefined) {
        element.set('strokeWidth', Number(options.strokeWidth))
      }

      if (options.opacity !== undefined) {
        element.set('opacity', Number(options.opacity))
      }

      // 更新端点坐标
      if (options.x1 !== undefined) element.set('x1', Number(options.x1))
      if (options.y1 !== undefined) element.set('y1', Number(options.y1))
      if (options.x2 !== undefined) element.set('x2', Number(options.x2))
      if (options.y2 !== undefined) element.set('y2', Number(options.y2))

      // 更新样式
      if (options.strokeLineCap !== undefined) {
        element.set('strokeLineCap', options.strokeLineCap)
      }

      if (options.strokeLineJoin !== undefined) {
        element.set('strokeLineJoin', options.strokeLineJoin)
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
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        opacity: element.opacity,
        x1: element.x1,
        y1: element.y1,
        x2: element.x2,
        y2: element.y2,
        strokeLineCap: element.strokeLineCap,
        strokeLineJoin: element.strokeLineJoin
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
        type: 'line',
        x: Math.round(element.left),
        y: Math.round(element.top),
        x1: element.x1,
        y1: element.y1,
        x2: element.x2,
        y2: element.y2,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        strokeLineCap: element.strokeLineCap,
        strokeLineJoin: element.strokeLineJoin,
        opacity: element.opacity,
        originX: element.originX,
        originY: element.originY
      }
    },

    decodeConfig(config) {
      return {
        eleType: 'line',
        left: config.x,
        top: config.y,
        x1: config.x1,
        y1: config.y1,
        x2: config.x2,
        y2: config.y2,
        stroke: config.stroke,
        strokeWidth: config.strokeWidth,
        strokeLineCap: config.strokeLineCap,
        strokeLineJoin: config.strokeLineJoin,
        opacity: config.opacity,
        originX: config.originX,
        originY: config.originY
      }
    }
  }
})