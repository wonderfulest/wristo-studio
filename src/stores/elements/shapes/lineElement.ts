import { defineStore } from 'pinia'
import { useBaseStore } from '../../baseStore'
import { useLayerStore } from '../../layerStore'
import { useBaseElementStore } from '../baseElement'
import { nanoid } from 'nanoid'
import { Line, Circle } from 'fabric'

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

      const canvas = this.baseStore.canvas

      const stroke = options.stroke
      const strokeWidth = Number(options.strokeWidth)

      let x1 = Math.round(options.x1)
      let y1 = Math.round(options.y1)
      let x2 = Math.round(options.x2)
      let y2 = Math.round(options.y2)

      const lineOptions: any = {
        id: nanoid(),
        eleType: 'line',
        stroke,
        strokeWidth,
        strokeLineCap: options.strokeLineCap || 'butt',
        strokeLineJoin: options.strokeLineJoin || 'bevel',
        strokeUniform: true,
        opacity: options.opacity,
        visible: true,
        selectable: false, // 仅支持拖动端点，不拖整条线
        hasControls: false,
        hasBorders: true,
      }

      const line = new Line([x1, y1, x2, y2], lineOptions as any)
      // 创建两个端点句柄（Circle）
      const startHandle = new Circle({
        left: x1,
        top: y1,
        radius: 6,
        fill: 'transparent',
        stroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
        opacity: 0, // 初始隐藏
        selectable: true,
        hasBorders: false,
        hasControls: false,
        hoverCursor: 'pointer',
      }) as any

      const endHandle = new Circle({
        left: x2,
        top: y2,
        radius: 6,
        fill: 'transparent',
        stroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
        opacity: 0, // 初始隐藏
        selectable: true,
        hasBorders: false,
        hasControls: false,
        hoverCursor: 'pointer',
      }) as any

      // 关联到 line，便于后续通过 updateElement 同步
      ;(line as any)._startHandle = startHandle
      ;(line as any)._endHandle = endHandle

      const updateLineFromHandles = () => {
        x1 = startHandle.left ?? x1
        y1 = startHandle.top ?? y1
        x2 = endHandle.left ?? x2
        y2 = endHandle.top ?? y2

        line.set({
          x1,
          y1,
          x2,
          y2,
        })
        canvas.requestRenderAll()
      }

      // 端点 hover 显示 / 离开隐藏
      startHandle.on('mouseover', () => {
        startHandle.set('opacity', 1)
        canvas.requestRenderAll()
      })

      startHandle.on('mouseout', () => {
        // 如果当前直线是选中状态，则保持端点可见
        const actives = canvas.getActiveObjects ? canvas.getActiveObjects() : []
        const isActive = Array.isArray(actives) && actives.includes(line as any)
        if (!isActive) {
          startHandle.set('opacity', 0)
          canvas.requestRenderAll()
        }
      })

      endHandle.on('mouseover', () => {
        endHandle.set('opacity', 1)
        canvas.requestRenderAll()
      })

      endHandle.on('mouseout', () => {
        // 如果当前直线是选中状态，则保持端点可见
        const actives = canvas.getActiveObjects ? canvas.getActiveObjects() : []
        const isActive = Array.isArray(actives) && actives.includes(line as any)
        if (!isActive) {
          endHandle.set('opacity', 0)
          canvas.requestRenderAll()
        }
      })

      // 端点拖拽逻辑
      startHandle.on('moving', () => {
        // 拖拽过程中保持可见
        startHandle.set('opacity', 1)
        startHandle.set({
          left: Math.max(0, Math.min(startHandle.left ?? 0, canvas.getWidth() ?? 0)),
          top: Math.max(0, Math.min(startHandle.top ?? 0, canvas.getHeight() ?? 0)),
        })
        updateLineFromHandles()
      })

      endHandle.on('moving', () => {
        // 拖拽过程中保持可见
        endHandle.set('opacity', 1)
        endHandle.set({
          left: Math.max(0, Math.min(endHandle.left ?? 0, canvas.getWidth() ?? 0)),
          top: Math.max(0, Math.min(endHandle.top ?? 0, canvas.getHeight() ?? 0)),
        })
        updateLineFromHandles()
      })

      // 拖拽结束后，如果鼠标离开端点区域，交给 mouseout 事件隐藏
      startHandle.on('mouseup', () => {
        canvas.requestRenderAll()
      })

      endHandle.on('mouseup', () => {
        canvas.requestRenderAll()
      })

      // 当整条线被整体移动时，同步端点句柄位置（根据 left/top 的增量移动端点）
      let lastLeft = (line as any).left ?? 0
      let lastTop = (line as any).top ?? 0
      line.on('moving', () => {
        const currentLeft = (line as any).left ?? 0
        const currentTop = (line as any).top ?? 0
        const dx = currentLeft - lastLeft
        const dy = currentTop - lastTop

        if (dx !== 0 || dy !== 0) {
          startHandle.set({
            left: (startHandle.left ?? 0) + dx,
            top: (startHandle.top ?? 0) + dy,
          })
          startHandle.setCoords()

          endHandle.set({
            left: (endHandle.left ?? 0) + dx,
            top: (endHandle.top ?? 0) + dy,
          })
          endHandle.setCoords()
        }

        lastLeft = currentLeft
        lastTop = currentTop

        canvas.requestRenderAll()
      })

      canvas.add(line as any, startHandle, endHandle)
      this.layerStore.addLayer(line as any)
      canvas.requestRenderAll()
      canvas.setActiveObject(line as any)

      return line
    },

    /**
     * 更新直线属性（简化版）
     */
    updateElement(element: any, options: LineUpdateOptions = {}) {
      if (!element) return

      if (options.stroke !== undefined) element.set('stroke', options.stroke)
      if (options.strokeWidth !== undefined)
        element.set('strokeWidth', Number(options.strokeWidth))
      if (options.opacity !== undefined) element.set('opacity', Number(options.opacity))

      if (options.x1 !== undefined) element.set('x1', Math.round(Number(options.x1)))
      if (options.y1 !== undefined) element.set('y1', Math.round(Number(options.y1)))
      if (options.x2 !== undefined) element.set('x2', Math.round(Number(options.x2)))
      if (options.y2 !== undefined) element.set('y2', Math.round(Number(options.y2)))

      if (options.strokeLineCap !== undefined)
        element.set('strokeLineCap', options.strokeLineCap)
      if (options.strokeLineJoin !== undefined)
        element.set('strokeLineJoin', options.strokeLineJoin)

      // 同步端点句柄位置（如果存在）
      const startHandle = (element as any)._startHandle
      const endHandle = (element as any)._endHandle

      if (startHandle) {
        startHandle.set({ left: element.x1, top: element.y1 })
        startHandle.setCoords()
      }

      if (endHandle) {
        endHandle.set({ left: element.x2, top: element.y2 })
        endHandle.setCoords()
      }

      element.setCoords()
      this.baseStore.canvas?.requestRenderAll()
    },

    /**
     * 编码
     */
    encodeConfig(element: any) {
      if (!element) {
        throw new Error('无效的元素')
      }

      return {
        eleType: 'line',
        id: element.id,
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

    /**
     * 解码
     */
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

    /**
     * 来自图层面板的选中事件：高亮被选中直线的端点
     */
    handleSelectedFromLayer(layer: any) {
      const canvas = this.baseStore.canvas
      if (!canvas) return

      const objects = (canvas.getObjects ? canvas.getObjects() : []) as any[]
      const selectedId = layer && layer.id

      objects.forEach((obj) => {
        if (obj.eleType !== 'line') return
        const startHandle = (obj as any)._startHandle
        const endHandle = (obj as any)._endHandle
        const isSelected = selectedId && obj.id === selectedId
        const opacity = isSelected ? 1 : 0
        if (startHandle) {
          startHandle.set('opacity', opacity)
        }
        if (endHandle) {
          endHandle.set('opacity', opacity)
        }
      })

      canvas.requestRenderAll?.()
    },
  },
})
