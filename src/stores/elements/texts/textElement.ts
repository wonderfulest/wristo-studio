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
  textProperty?: string
}

export const useTextStore = defineStore('textElement', {
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
      console.log('Adding text element with options:', options)
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add text element')
      }

      try {
        const element = new FabricText(options.text || 'New Text', {
          id: nanoid(),
          eleType: 'text',
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
          textProperty: options.textProperty,
        } as any)

        this.baseStore.canvas.add(element as any)
        ;(element as any).elementId = (element as any).id
        this.layerStore.addLayer(element as any)
        this.baseStore.canvas.renderAll()
        this.baseStore.canvas.setActiveObject(element as any)

        return element
      } catch (error) {
        console.error('Failed to create text element:', error)
        throw error
      }
    },
    // 导出用：将画布上的 text 元素编码为通用 TextElementConfig
    encodeConfig(element: FabricElement): TextElementConfig {
      const fabricAny = element as any
      return {
        id: fabricAny.id ?? '',
        eleType: 'text',
        left: typeof element.left === 'number' ? element.left : 0,
        top: typeof element.top === 'number' ? element.top : 0,
        originX: (element as any).originX ?? 'center',
        originY: (element as any).originY ?? 'center',
        fill: (element as any).fill ?? '#FFFFFF',
        fontFamily: fabricAny.fontFamily ?? '',
        fontSize: typeof fabricAny.fontSize === 'number' ? fabricAny.fontSize : 18,
        textProperty: fabricAny.textProperty,
        textTemplate: typeof fabricAny.textTemplate === 'string'
          ? fabricAny.textTemplate
          : (typeof fabricAny.text === 'string' ? fabricAny.text : ''),
      }
    },
    decodeConfig(config: TextElementConfig): Partial<FabricElement> {
      const textTemplate = (config as any).textTemplate ?? ''
      const element: Partial<FabricElement> = {
        id: config.id,
        eleType: 'text',
        left: config.left,
        top: config.top,
        originX: config.originX,
        originY: config.originY,
        fill: config.fill,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        textProperty: config.textProperty,
        textTemplate,
        text: textTemplate,
      } as any
      return element
    },
  },
})
