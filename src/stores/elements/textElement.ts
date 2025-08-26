import { defineStore } from 'pinia'
import { useBaseStore } from '../baseStore'
import { useLayerStore } from '../layerStore'
import { nanoid } from 'nanoid'
import { Text as FabricText } from 'fabric'

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
    encodeConfig(element: any) {
      if (!element) {
        throw new Error('Invalid element')
      }
      return {
        type: 'text',
        x: Math.round(element.left),
        y: Math.round(element.top),
        originX: element.originX,
        originY: element.originY,
        font: element.fontFamily || '',
        size: element.fontSize || '-1',
        color: element.fill || '',
        formatter: element.formatter || '',
      }
    },
  },
})
