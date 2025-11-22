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

export const useAngledTextStore = defineStore('angledTextElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()

    return {
      baseStore,
      layerStore,
    }
  },

  actions: {
    async addElement(options: TextOptions = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add angled text element')
      }

      try {
        const element = new FabricText(options.text || 'Angled Text', {
          id: nanoid(),
          eleType: 'angledText',
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
          angle: -45,
        } as any)

        this.baseStore.canvas.add(element as any)
        ;(element as any).elementId = (element as any).id
        this.layerStore.addLayer(element as any)
        this.baseStore.canvas.renderAll()
        this.baseStore.canvas.setActiveObject(element as any)

        return element
      } catch (error) {
        console.error('Failed to create angled text element:', error)
        throw error
      }
    },
    encodeConfig(element: any) {
      if (!element) {
        throw new Error('Invalid element')
      }
      const textTemplate = (element as any).textTemplate ?? element.text ?? ''
      return {
        type: 'angledText',
        x: Math.round(element.left),
        y: Math.round(element.top),
        originX: element.originX,
        originY: element.originY,
        font: element.fontFamily || '',
        size: element.fontSize || '-1',
        color: element.fill || '',
        formatter: textTemplate,
        angle: typeof element.angle === 'number' ? element.angle : -45,
      }
    },
    decodeConfig(config: TextElementConfig): Partial<FabricElement> {
      const textTemplate = (config as any).textTemplate ?? ''
      const element: Partial<FabricElement> = {
        id: config.id,
        eleType: 'angledText',
        left: config.left,
        top: config.top,
        originX: config.originX,
        originY: config.originY,
        fill: config.fill,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        textTemplate,
        text: textTemplate,
        angle: typeof (config as any).angle === 'number' ? (config as any).angle : -45,
      } as any
      return element
    },
  },
})
