import { defineStore } from 'pinia'
import { useBaseStore } from '../../baseStore'
import { useLayerStore } from '../../layerStore'
import { nanoid } from 'nanoid'
import FabricRadialText from '@/lib/radialText'
import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'

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
    async addElement(options: TextElementConfig ) {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add radial text element')
      }
      console.log('[111 addElement radialText] options', options)

      try {
        const cx = options.left ?? 0
        const cy = options.top ?? 0
        const radius = typeof options.radius === 'number' ? options.radius : 100
        const angle = typeof options.angle === 'number' ? options.angle : 0
        const direction = options.direction === 'counterClockwise' ? -1 : 1

        const radial = new FabricRadialText({
          text: options.textTemplate || 'Radial Text',
          cx,
          cy,
          radius,
          fontSize: Number(options.fontSize),
          fontFamily: options.fontFamily,
          startAngle: angle,
          direction,
          inner: false,
          charSpacing: 0,
          fill: options.fill,
        })

        const element = radial.render() as any

        // 基本标识
        element.id = nanoid()
        element.eleType = 'radialText'

        // 位置与布局相关属性
        element.radius = radius
        element.startAngle = angle
        element.direction = options.direction || 'clockwise'
        element.justification = options.justification || 'center'

        // 同步文本与字体相关属性，方便设置面板直接读取
        element.fill = options.fill
        element.fontFamily = options.fontFamily
        element.fontSize = options.fontSize
        const textTemplate = options.textTemplate || 'Radial Text'
        element.textTemplate = textTemplate
        element.text = textTemplate

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
    encodeConfig(element: any): TextElementConfig {
      if (!element) {
        throw new Error('Invalid element')
      }

      const fabricAny = element as any
      const textTemplate =
        typeof fabricAny.textTemplate === 'string'
          ? fabricAny.textTemplate
          : (typeof fabricAny.text === 'string' ? fabricAny.text : '')

      const config: TextElementConfig = {
        id: fabricAny.id ?? '',
        eleType: 'radialText',
        left: typeof element.left === 'number' ? element.left : 0,
        top: typeof element.top === 'number' ? element.top : 0,
        originX: fabricAny.originX ?? 'center',
        originY: fabricAny.originY ?? 'center',
        fill: fabricAny.fill ?? '#FFFFFF',
        fontFamily: fabricAny.fontFamily ?? 'Noto Sans SC',
        fontSize: typeof fabricAny.fontSize === 'number' ? fabricAny.fontSize : 36,
        textTemplate,
        angle: typeof fabricAny.startAngle === 'number' ? fabricAny.startAngle : (fabricAny.radialMeta?.startAngle ?? 0),
        radius: typeof fabricAny.radius === 'number' ? fabricAny.radius : 100,
        direction: fabricAny.direction || 'clockwise',
        justification: fabricAny.justification || 'center',
      }

      console.log('[111 encodeConfig radialText] config', config)

      return config
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
