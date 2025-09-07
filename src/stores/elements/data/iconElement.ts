import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { FabricText, TextProps } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import type { FabricElement } from '@/types/element'
import type { IconElementConfig } from '@/types/elements'
import { DataTypeOption } from '@/types/settings'
import { usePropertiesStore } from '@/stores/properties'

export const useIconStore = defineStore('iconElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    const propertiesStore = usePropertiesStore()
    return {
      baseStore,
      layerStore,
      propertiesStore
    }
  },
  actions: {
    async addElement(config: IconElementConfig): Promise<FabricText> {
      if (!this.baseStore?.canvas) {
        throw new Error('Canvas is not initialized, cannot add icon element')
      }
      try {
        type IconProps = TextProps & IconElementConfig
        const metric = usePropertiesStore().getMetricByOptions(config)
        const iconOptions: Partial<IconProps> = {
          id: config.id || nanoid(),
          eleType: 'icon',
          left: config.left,
          top: config.top,
          originX: config.originX as 'center' | 'left' | 'right',
          originY: config.originY as 'center' | 'top' | 'bottom',
          fill: config.fill,
          fontSize: Number(config.iconSize),
          fontFamily: config.iconFont,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          metricSymbol: config.metricSymbol,
          dataProperty: config.dataProperty,
          goalProperty: config.goalProperty,
        }
        const element = new FabricText(metric.icon, iconOptions as TextProps & IconElementConfig)
        this.baseStore.canvas?.add(element as FabricText)
        this.layerStore.addLayer(element as any)
        this.baseStore.canvas?.setActiveObject(element as FabricText)
        this.baseStore.canvas?.renderAll()
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
        fontFamily: config.iconFont,
        originX: config.originX,
        originY: config.originY,
        left: config.left,
        top: config.top,
        metricSymbol: config.metricSymbol,
        dataProperty: config.dataProperty,
        goalProperty: config.goalProperty,
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
        fill: element.fill as string,
        originX: element.originX,
        originY: element.originY,
        iconFont: element.fontFamily as string,
        iconSize: Number(element.fontSize),
        dataProperty: element.dataProperty,
        goalProperty: element.goalProperty,
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
        fill: config.fill as string,
        originX: config.originX,
        originY: config.originY,
        iconFont: config.iconFont,
        iconSize: config.iconSize,
        dataProperty: config.dataProperty,
        goalProperty: config.goalProperty,
        metricSymbol: config.metricSymbol,
      }
    },
  },
})
