import { defineStore } from 'pinia'
import { useBaseStore } from '../../baseStore'
import { useLayerStore } from '../../layerStore'
import { nanoid } from 'nanoid'
import FabricRadialText from '@/lib/radialText'
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
  angle?: number
  radius?: number
  direction?: string
  justification?: string | number
}

export const useRadialTextStore = defineStore('radialTextElement', {
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
        throw new Error('Canvas is not initialized, cannot add radial text element')
      }

      try {
        const cx = options.left ?? 0
        const cy = options.top ?? 0
        const radius = typeof options.radius === 'number' ? options.radius : 100
        const angle = typeof options.angle === 'number' ? options.angle : 0
        const direction = options.direction === 'counterClockwise' ? -1 : 1

        const radial = new FabricRadialText({
          text: options.text || 'Radial Text',
          cx,
          cy,
          radius,
          fontSize: Number(options.size) || 36,
          fontFamily: options.fontFamily || 'Noto Sans SC',
          startAngle: angle,
          direction,
          inner: false,
          charSpacing: 0,
          fill: options.textColor || '#FFFFFF',
        })

        const element = radial.render() as any
        element.id = nanoid()
        element.eleType = 'radialText'
        element.radius = radius
        element.angle = angle
        element.direction = options.direction || 'clockwise'
        element.justification = options.justification || 'center'

        this.baseStore.canvas.add(element as any)
        ;(element as any).elementId = (element as any).id
        this.layerStore.addLayer(element as any)
        this.baseStore.canvas.renderAll()
        this.baseStore.canvas.setActiveObject(element as any)

        return element
      } catch (error) {
        console.error('Failed to create radial text element:', error)
        throw error
      }
    },
    encodeConfig(element: any) {
      if (!element) {
        throw new Error('Invalid element')
      }
      const textTemplate = (element as any).textTemplate ?? element.text ?? ''
      return {
        type: 'radialText',
        x: Math.round(element.left),
        y: Math.round(element.top),
        originX: element.originX,
        originY: element.originY,
        font: element.fontFamily || '',
        size: element.fontSize || '-1',
        color: element.fill || '',
        formatter: textTemplate,
        angle: typeof element.angle === 'number' ? element.angle : 0,
        radius: typeof (element as any).radius === 'number' ? (element as any).radius : 100,
        direction: (element as any).direction || 'clockwise',
        justification: (element as any).justification || 'center',
      }
    },
    decodeConfig(config: TextElementConfig): Partial<FabricElement> {
      const textTemplate = (config as any).textTemplate ?? ''
      const element: Partial<FabricElement> = {
        id: config.id,
        eleType: 'radialText',
        left: config.left,
        top: config.top,
        originX: config.originX,
        originY: config.originY,
        fill: config.fill,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        textTemplate,
        text: textTemplate,
        angle: typeof (config as any).angle === 'number' ? (config as any).angle : 0,
        radius: typeof (config as any).radius === 'number' ? (config as any).radius : 100,
        direction: (config as any).direction || 'clockwise',
        justification: (config as any).justification || 'center',
      } as any
      return element
    },
  },
})
