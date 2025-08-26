import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { FabricText, TextProps } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import type { FabricElement } from '@/types/element'
import type { IconElementConfig } from '@/types/elementConfig'
import type { CustomTextProps } from '@/types/elements/custom-props'
import type { CustomIconProps } from '@/types/elements/custom-props'

export const useIconStore = defineStore('iconElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
      defaults: {
        fontSize: 16,
        fill: '#ffffff',
        iconFontFamily: 'Material Icons',
      },
    }
  },
  actions: {
    addElement(config: IconElementConfig): Promise<FabricElement> {
      const id = nanoid()
      type MyTextProps = TextProps & CustomTextProps & CustomIconProps
      const options: Partial<MyTextProps> = {
        id,
        eleType: 'icon',
        left: config.x,
        top: config.y,
        fontSize: Number(config.fontSize ?? this.defaults.fontSize),
        fill: config.fill ?? this.defaults.fill,
        fontFamily: config.fontFamily ?? this.defaults.iconFontFamily,
        originX: config.originX as 'center' | 'left' | 'right' ?? 'center',
        originY: config.originY as 'center' | 'top' | 'bottom' ?? 'center',
        selectable: true,
        hasControls: true,
        hasBorders: true,
      }
      const element = new FabricText('1', options)

      this.baseStore.canvas?.add(element)
      this.layerStore.addLayer(element)
      this.baseStore.canvas?.setActiveObject(element)
      this.baseStore.canvas?.renderAll()
      return element
    },

    updateElement(element: any, config: Partial<IconElementConfig>) {
      const canvas = this.baseStore.canvas
      const obj: any = canvas?.getObjects().find((o: any) => o.id === element.id)
      if (!canvas || !obj) return

      if (config.fill !== undefined) obj.set('fill', config.fill)
      if (config.fontSize !== undefined) obj.set('fontSize', config.fontSize)
      if (config.fontFamily !== undefined) obj.set('fontFamily', config.fontFamily)
      if (config.metricSymbol !== undefined) obj.set('metricSymbol', config.metricSymbol)

      obj.setCoords()
      canvas.renderAll()
    },

    encodeConfig(element: FabricElement): IconElementConfig {
      if (!element) throw new Error('Invalid element')
      return {
        id: element.id || '',
        type: 'icon',
        x: element.left || 0,
        y: element.top || 0,
        originX: element.originX || 'center',
        originY: element.originY || 'center',
        fontFamily: element.fontFamily || this.defaults.iconFontFamily,
        fontSize: element.fontSize || this.defaults.fontSize,
        fill: element.fill || this.defaults.fill,
        metricSymbol: element.metricSymbol || ':FIELD_TYPE_HEART_RATE',
      }
    },

    decodeConfig(config: IconElementConfig): Partial<FabricElement> {
      return {
        id: config.id,
        type: 'icon',
        left: config.x,
        top: config.y,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        fill: config.fill,
        originX: config.originX,
        originY: config.originY,
        metricSymbol: config.metricSymbol,
      }
    },
  },
})
