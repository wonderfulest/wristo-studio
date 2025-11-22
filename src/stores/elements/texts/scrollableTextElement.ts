import { defineStore } from 'pinia'
import { useBaseStore } from '../../baseStore'
import { useLayerStore } from '../../layerStore'
import { nanoid } from 'nanoid'
import { FabricText } from 'fabric'
import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'

interface TextOptions {
  text?: string
  left?: number
  top?: number
  size?: number | string
  textColor?: string
  fontFamily?: string
  originX?: string
  originY?: string
}

export const useScrollableTextStore = defineStore('scrollableTextElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()

    return {
      baseStore,
      layerStore,
      scrollIntervals: {} as Record<string, number>,
    }
  },

  actions: {
    async addElement(options: TextOptions = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add scrollable text element')
      }

      try {
        const element = new FabricText(options.text || 'New Text', {
          id: nanoid(),
          eleType: 'scrollableText',
          left: options.left,
          top: options.top,
          fontSize: Number(options.size) || 36,
          fill: options.textColor || '#FFFFFF',
          fontFamily: options.fontFamily,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          originX: options.originX || 'center',
          originY: options.originY || 'center',
        } as any)

        this.baseStore.canvas.add(element as any)
        ;(element as any).elementId = (element as any).id
        this.layerStore.addLayer(element as any)
        this.baseStore.canvas.renderAll()
        this.baseStore.canvas.setActiveObject(element as any)

        this.startScrollableAnimation(element as any)

        return element
      } catch (error) {
        console.error('Failed to create scrollable text element:', error)
        throw error
      }
    },
    encodeConfig(element: any) {
      if (!element) {
        throw new Error('Invalid element')
      }
      const textTemplate = (element as any).textTemplate ?? element.text ?? ''
      return {
        type: 'scrollableText',
        x: Math.round(element.left),
        y: Math.round(element.top),
        originX: element.originX,
        originY: element.originY,
        font: element.fontFamily || '',
        size: element.fontSize || '-1',
        color: element.fill || '',
        formatter: textTemplate,
      }
    },
    decodeConfig(config: TextElementConfig): Partial<FabricElement> {
      const textTemplate = (config as any).textTemplate ?? ''
      const element: Partial<FabricElement> = {
        id: config.id,
        eleType: 'scrollableText',
        left: config.left,
        top: config.top,
        originX: config.originX,
        originY: config.originY,
        fill: config.fill,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        textTemplate,
        text: textTemplate,
      } as any
      return element
    },
    startScrollableAnimation(element: FabricElement) {
      const canvas = this.baseStore.canvas
      if (!canvas) return

      const id = String((element as any).id ?? '')
      if (!id) return

      if (this.scrollIntervals[id]) {
        clearInterval(this.scrollIntervals[id])
      }

      const speed = 1
      const interval = window.setInterval(() => {
        const t = element as any
        if (!canvas || !t) return

        const width = Number(t.width ?? 0)
        const currentLeft = Number(t.left ?? 0)
        const nextLeft = currentLeft - speed

        t.set('left', nextLeft)
        t.setCoords()

        const canvasWidth = canvas.getWidth() ?? 0
        if (nextLeft + width < -10) {
          t.set('left', canvasWidth + 10)
          t.setCoords()
        }

        canvas.requestRenderAll()
      }, 30)

      this.scrollIntervals[id] = interval
    },
  },
})
