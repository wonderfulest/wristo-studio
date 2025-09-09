import { defineStore } from 'pinia'
import { useBaseStore } from '../../baseStore'
import { useLayerStore } from '../../layerStore'
import { useBaseElementStore } from '../baseElement'
import { nanoid } from 'nanoid'
import { Line } from 'fabric'

interface LineOptions {
  stroke: string
  strokeWidth: number
  opacity: number
  x1: number
  y1: number 
  x2: number
  y2: number
  strokeLineCap?: 'butt' | 'round' | 'square'
  strokeLineJoin?: 'bevel' | 'round' | 'miter'
  constrainInside?: boolean
}

type LineUpdateOptions = Partial<LineOptions>

export const useLineElementStore = defineStore('lineElement', {
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
    async addElement(options: LineOptions) {
      if (!this.baseStore.canvas) {
        throw new Error('画布未初始化，无法添加直线元素')
      }

      try {
        console.log('add line options', options)
        const stroke = options.stroke
        const strokeWidth = Number(options.strokeWidth)

        // 默认值改为“居中水平线”，仅当未传入对应坐标时使用默认
        const canvasWidth = Number(this.baseStore.canvas?.getWidth?.() ?? this.baseStore.WATCH_SIZE)
        const canvasHeight = Number(this.baseStore.canvas?.getHeight?.() ?? this.baseStore.WATCH_SIZE)
        const centerX = canvasWidth / 2
        const centerY = canvasHeight / 2
        let x1 = Math.round(options.x1)
        let y1 = Math.round(options.y1)
        let x2 = Math.round(options.x2)
        let y2 = Math.round(options.y2)

        // Constrain endpoints inside the circular clipPath by default to avoid being clipped
        const shouldConstrain = options.constrainInside !== false
        if (shouldConstrain) {
          const circle: any = this.baseStore.watchFaceCircle
          const cx = Number(circle?.left ?? centerX)
          const cy = Number(circle?.top ?? centerY)
          const r = Number(circle?.radius ?? Math.min(canvasWidth, canvasHeight) / 2)
          const margin = Math.max(1, strokeWidth) // keep a small margin inside the circle

          const clampToCircle = (px: number, py: number) => {
            const dx = px - cx
            const dy = py - cy
            const dist = Math.sqrt(dx * dx + dy * dy)
            const maxDist = Math.max(0, r - margin)
            if (dist === 0) return { x: cx, y: cy }
            if (dist <= maxDist) return { x: px, y: py }
            const scale = maxDist / dist
            return { x: cx + dx * scale, y: cy + dy * scale }
          }

          const p1 = clampToCircle(x1, y1)
          const p2 = clampToCircle(x2, y2)
          x1 = p1.x
          y1 = p1.y
          x2 = p2.x
          y2 = p2.y
        }

        const lineOptions: any = {
          id: nanoid(),
          eleType: 'line',
          stroke: stroke,
          strokeWidth: strokeWidth,
          strokeLineCap: options.strokeLineCap || 'butt',
          strokeLineJoin: options.strokeLineJoin || 'bevel',
          strokeUniform: true,
          visible: true,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockScalingFlip: true,
        }

        console.log('draw line', [x1, y1, x2, y2], lineOptions)
        const line = new Line([x1, y1, x2, y2], lineOptions as any)

        this.baseStore.canvas.add(line as any)
        this.layerStore.addLayer(line as any)
        this.baseStore.canvas.renderAll()
        this.baseStore.canvas.setActiveObject(line as any)

        return line
      } catch (error) {
        console.error('创建直线元素失败:', error)
        throw error
      }
    },

    updateElement(element: any, options: LineUpdateOptions = {}) {
      if (!element) return

      // 基础样式
      if (options.stroke !== undefined) element.set('stroke', options.stroke)
      if (options.strokeWidth !== undefined) element.set('strokeWidth', Number(options.strokeWidth))
      if (options.opacity !== undefined) element.set('opacity', Number(options.opacity))

      // 端点坐标
      if (options.x1 !== undefined) element.set('x1', Math.round(Number(options.x1)))
      if (options.y1 !== undefined) element.set('y1', Math.round(Number(options.y1)))
      if (options.x2 !== undefined) element.set('x2', Math.round(Number(options.x2)))
      if (options.y2 !== undefined) element.set('y2', Math.round(Number(options.y2)))

      // 约束到圆形裁剪内（默认开启）以避免被裁剪
      const shouldConstrain = options.constrainInside !== false
      if (shouldConstrain) {
        const canvasWidth = Number(this.baseStore.canvas?.getWidth?.() ?? this.baseStore.WATCH_SIZE)
        const canvasHeight = Number(this.baseStore.canvas?.getHeight?.() ?? this.baseStore.WATCH_SIZE)
        const centerX = canvasWidth / 2
        const centerY = canvasHeight / 2
        const circle: any = this.baseStore.watchFaceCircle
        const cx = Number(circle?.left ?? centerX)
        const cy = Number(circle?.top ?? centerY)
        const r = Number(circle?.radius ?? Math.min(canvasWidth, canvasHeight) / 2)
        const margin = Math.max(1, Number(element.strokeWidth) || 1)

        const clampToCircle = (px: number, py: number) => {
          const dx = px - cx
          const dy = py - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = Math.max(0, r - margin)
          if (dist === 0) return { x: cx, y: cy }
          if (dist <= maxDist) return { x: px, y: py }
          const scale = maxDist / dist
          return { x: cx + dx * scale, y: cy + dy * scale }
        }

        const p1 = clampToCircle(Number(element.x1), Number(element.y1))
        const p2 = clampToCircle(Number(element.x2), Number(element.y2))
        element.set({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
      }

      if (options.strokeLineCap !== undefined) {
        element.set('strokeLineCap', options.strokeLineCap)
      }

      if (options.strokeLineJoin !== undefined) {
        element.set('strokeLineJoin', options.strokeLineJoin)
      }


      element.initialConfig = {
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        opacity: element.opacity,
        x1: element.x1,
        y1: element.y1,
        x2: element.x2,
        y2: element.y2,
        strokeLineCap: element.strokeLineCap,
        strokeLineJoin: element.strokeLineJoin,
      }

      element.setCoords()
      element.dirty = true
      // 使用 requestRenderAll 提升性能，避免频繁完整重绘
      this.baseStore.canvas?.requestRenderAll()
    },

    encodeConfig(element: any) {
      if (!element) {
        throw new Error('无效的元素')
      }

      return {
        eleType: 'line',
        x1: element.x1,
        y1: element.y1,
        x2: element.x2,
        y2: element.y2,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        strokeLineCap: element.strokeLineCap,
        strokeLineJoin: element.strokeLineJoin,
        opacity: element.opacity,
      }
    },

    decodeConfig(config: any) {
      return {
        eleType: 'line',
        x1: config.x1,
        y1: config.y1,
        x2: config.x2,
        y2: config.y2,
        stroke: config.stroke,
        strokeWidth: config.strokeWidth,
        strokeLineCap: config.strokeLineCap,
        strokeLineJoin: config.strokeLineJoin,
        opacity: config.opacity,
      }
    },
  },
})
