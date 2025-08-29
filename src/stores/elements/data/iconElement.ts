import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { FabricText, TextProps } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import type { FabricElement } from '@/types/element'
import type { IconElementConfig } from '@/types/elements'
import { getMetricBySymbol } from '@/config/settings'
import { DataTypeOption } from '@/types/settings'

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
    async addElement(options: IconElementConfig): Promise<FabricText> {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add icon element')
      }
      try {
        type IconProps = TextProps & IconElementConfig
        const iconOptions: Partial<IconProps> = {
          id: options.id || nanoid(),
          eleType: 'icon',
          left: options.left,
          top: options.top,
          originX: options.originX as 'center' | 'left' | 'right',
          originY: options.originY as 'center' | 'top' | 'bottom',
          fill: options.fill ?? this.defaults.fill,
          fontSize: Number(options.fontSize ?? this.defaults.fontSize),
          fontFamily: options.iconFontFamily,
          metricSymbol: options.metricSymbol,
          selectable: true,
          hasControls: true,
          hasBorders: true,
        }

        const metric: DataTypeOption = getMetricBySymbol(options.metricSymbol)
        const element = new FabricText(metric.icon || '1', iconOptions as IconProps)
        this.baseStore.canvas.add(element as any)
        this.layerStore.addLayer(element as any)
        this.baseStore.canvas.setActiveObject(element as any)
        this.baseStore.canvas.renderAll()
        return element
      } catch (error) {
        console.error('Failed to create icon element:', error)
        throw error
      }
    },

    updateElement(element: any, config: Partial<IconElementConfig>) {
      const canvas = this.baseStore.canvas
      const obj: any = canvas?.getObjects().find((o: any) => o.id === element.id)
      if (!canvas || !obj) return

      const currentLeft = obj.left
      const currentTop = obj.top

      const updateProps: Record<string, any> = {
        fontSize: config.fontSize,
        fill: config.fill,
        fontFamily: config.iconFontFamily,
        metricSymbol: config.metricSymbol,
        originX: config.originX,
        originY: config.originY,
        left: config.left,
        top: config.top,
      }

      Object.keys(updateProps).forEach((key) => {
        const value = updateProps[key]
        if (value !== undefined) {
          obj.set(key, value)
        }
      })

      if (config.left === undefined) obj.set('left', currentLeft)
      if (config.top === undefined) obj.set('top', currentTop)

      obj.setCoords()
      canvas.renderAll()
    },

    encodeConfig(element: FabricElement): IconElementConfig {
      if (!element) throw new Error('Invalid element')
      const config = {
        id: element.id,
        eleType: 'icon',
        left: element.left,
        top: element.top,
        originX: element.originX,
        originY: element.originY,
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        fill: element.fill,
        iconSize: element.fontSize,
        metricSymbol: element.metricSymbol,
      }
      return config as IconElementConfig
    },

    decodeConfig(config: IconElementConfig): Partial<FabricElement> {
      return {
        id: config.id,
        eleType: 'icon',
        left: config.left,
        top: config.top,
        fontSize: config.iconSize,
        fontFamily: config.iconFontFamily,
        fill: config.fill,
        originX: config.originX,
        originY: config.originY,
        metricSymbol: config.metricSymbol,
      }
    },
  },
})
