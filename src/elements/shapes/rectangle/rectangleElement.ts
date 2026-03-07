import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
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

    return {
      baseStore,
      layerStore,
    }
  },

  actions: {
    async addElement(options: RectangleOptions = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add rectangle element')
      }

      try {
        const elementDataStore = useElementDataStore()
        const width = Number(options.width ?? 100)
        const height = Number(options.height ?? 100)
        const fill = options.fill || '#FFFFFF'
        const stroke = options.stroke || '#000000'
        const strokeWidth = Number(options.strokeWidth ?? 0)
        const opacity = Number(options.opacity ?? 1)
        const borderRadius = Number(options.borderRadius ?? 0)

        const id = nanoid()

        const rectOptions: any = {
          id,
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
          // 启用 Fabric 默认控制点，允许通过控制点缩放矩形
          hasControls: true,
          hasBorders: true,
          lockScalingX: false,
          lockScalingY: false,
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

        // 将业务配置写入 ElementDataStore，作为权威数据源之一
        elementDataStore.upsertElement({
          id: String(id),
          eleType: 'rectangle',
          left: rectangle.left,
          top: rectangle.top,
          width: rectangle.width,
          height: rectangle.height,
          fill: rectangle.fill,
          stroke: rectangle.stroke,
          strokeWidth: rectangle.strokeWidth,
          opacity: rectangle.opacity,
          borderRadius: (rectangle as any).rx,
          originX: rectangle.originX,
          originY: rectangle.originY,
        } as any)

        // 当通过控制点等方式修改矩形时，将 scale 折算回 width/height，并同步更新 ElementDataStore
        rectangle.on('modified', () => {
          const idOnRect = (rectangle as any).id
          if (!idOnRect) return

          // Fabric 在缩放时通常改的是 scaleX/scaleY，这里把它折算回绝对宽高，避免宽高与视觉尺寸不一致
          const rawWidth = Number((rectangle as any).width ?? 0)
          const rawHeight = Number((rectangle as any).height ?? 0)
          const sx = Number((rectangle as any).scaleX ?? 1)
          const sy = Number((rectangle as any).scaleY ?? 1)

          const nextWidth = rawWidth * (Number.isFinite(sx) ? sx : 1)
          const nextHeight = rawHeight * (Number.isFinite(sy) ? sy : 1)

          if (Number.isFinite(nextWidth) && Number.isFinite(nextHeight) && nextWidth > 0 && nextHeight > 0) {
            rectangle.set({
              width: nextWidth,
              height: nextHeight,
              scaleX: 1,
              scaleY: 1,
            } as any)
            rectangle.setCoords()
          }

          const store = useElementDataStore()
          store.patchElement(String(idOnRect), {
            left: rectangle.left as number,
            top: rectangle.top as number,
            width: rectangle.width as number,
            height: rectangle.height as number,
            fill: rectangle.fill as string,
            stroke: rectangle.stroke as string,
            strokeWidth: rectangle.strokeWidth as number,
            opacity: rectangle.opacity as number,
            borderRadius: (rectangle as any).rx as number,
          } as any)

          this.baseStore.canvas?.requestRenderAll?.()
        })

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

      const elementDataStore = useElementDataStore()
      const id = (element as any).id

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

      if (id != null) {
        console.debug('[RectangleElement] updateElement patchElement', {
          id: String(id),
          options,
          next: {
            left: element.left,
            top: element.top,
            width: element.width,
            height: element.height,
          },
        })
        elementDataStore.patchElement(String(id), {
          left: element.left as number,
          top: element.top as number,
          width: element.width as number,
          height: element.height as number,
          fill: element.fill as string,
          stroke: element.stroke as string,
          strokeWidth: element.strokeWidth as number,
          opacity: element.opacity as number,
          borderRadius: (element as any).rx as number,
        } as any)
      }
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
