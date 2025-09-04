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
    async addElement(options: IconElementConfig): Promise<FabricText> {
      if (!this.baseStore?.canvas) {
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
          fill: options.fill,
          fontSize: Number(options.fontSize),
          fontFamily: options.iconFontFamily || 'super-icons',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          metricSymbol: options.metricSymbol,
          dataProperty: options.dataProperty,
          goalProperty: options.goalProperty,
        }
        console.log('metric icon', options.metricSymbol)
       
        const metric: DataTypeOption = this.propertiesStore.getMetricByOptions({
          goalProperty: options.goalProperty,
          dataProperty: options.dataProperty,
          metricSymbol: options.metricSymbol,
        })
        console.log('metric icon', metric?.icon)
        // 确保字符为字符串，且 0 不被当作 falsy
        const element = new FabricText(metric.icon, iconOptions as TextProps & IconElementConfig)
        element.set({
          dataProperty: metric.value,
          goalProperty: metric.value,
          metricSymbol: metric.metricSymbol,
          metricValue: metric.value,
        })
        this.baseStore.canvas?.add(element as FabricText)
        // addLayer expects MinimalFabricLike with eleType/id; runtime object has those props
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
        fontFamily: config.iconFontFamily,
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
        originX: element.originX,
        originY: element.originY,
        iconFontFamily: element.fontFamily as string,
        iconSize: Number(element.fontSize),
        fontSize: Number(element.fontSize),
        fill: element.fill as string,
        metricSymbol: element.metricSymbol,
        dataProperty: element.dataProperty,
        goalProperty: element.goalProperty,
      }
      return config as IconElementConfig
    },

    decodeConfig(config: IconElementConfig): Partial<FabricElement> {
      return {
        id: config.id,
        eleType: 'icon',
        left: config.left,
        top: config.top,
        fontSize: Number(config.iconSize ?? (config as any).fontSize),
        fontFamily: (config.iconFontFamily ?? (config as any).fontFamily) as string,
        fill: config.fill as string,
        originX: config.originX,
        originY: config.originY,
        metricSymbol: config.metricSymbol,
        iconFontFamily: config.iconFontFamily,
        iconSize: config.iconSize,
        dataProperty: config.dataProperty,
        goalProperty: config.goalProperty,
      }
    },
  },
})
