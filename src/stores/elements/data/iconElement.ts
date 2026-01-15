import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { FabricText, TextProps } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import type { FabricElement } from '@/types/element'
import type { IconElementConfig } from '@/types/elements'
import { usePropertiesStore } from '@/stores/properties'
import type { MinimalFabricLike } from '@/types/layer'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'

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
      console.log('addElement icon', config)
      if (!this.baseStore?.canvas) {
        throw new Error('Canvas is not initialized, cannot add icon element')
      }
      try {
        type IconProps = TextProps & IconElementConfig
        const metric = usePropertiesStore().getMetricByOptions(config)
        const resolvedFontFamily = this.baseStore.currentIconFontSlug || config.iconFont
        const resolvedFontSize = this.baseStore.currentIconFontSize === -1 ? Number(config.iconSize) : this.baseStore.currentIconFontSize
        console.log('resolvedFontFamily', resolvedFontFamily)
        console.log('resolvedFontSize', resolvedFontSize)
        const iconOptions: Partial<IconProps> = {
          id: config.id || nanoid(),
          eleType: 'icon',
          left: config.left,
          top: config.top,
          originX: config.originX as 'center' | 'left' | 'right',
          originY: 'center',
          fill: config.fill,
          fontSize: resolvedFontSize,
          fontFamily: resolvedFontFamily,
          metricSymbol: config.metricSymbol,
          dataProperty: config.dataProperty,
          goalProperty: config.goalProperty,
          selectable: true,
          hasControls: false,
          hasBorders: true,
        }
        const element = new FabricText(metric.icon, iconOptions as TextProps & IconElementConfig)
        this.baseStore.canvas?.add(element as FabricText)
        this.layerStore.addLayer(element as unknown as MinimalFabricLike)
        this.baseStore.canvas?.setActiveObject(element as FabricText)
        this.baseStore.canvas?.renderAll()
        return element
      } catch (error) {
        console.error('Failed to create icon element:', error)
        throw error
      }
    },

    updateElement(element: FabricElement, config: Partial<IconElementConfig>) {
      const canvas = this.baseStore.canvas
      if (!canvas) return
      const objects = canvas.getObjects() as FabricText[]
      const obj = objects.find((o) => (o as unknown as FabricElement).id === element.id)
      if (!obj) return

      const currentLeft = obj.left
      const currentTop = obj.top

      const updateProps: Partial<TextProps & IconElementConfig> = {
        fontSize: config.fontSize,
        fill: config.fill,
        fontFamily: config.iconFont ?? config.fontFamily,
        originX: config.originX,
        originY: config.originY,
        left: config.left,
        top: config.top,
        metricSymbol: config.metricSymbol,
        dataProperty: config.dataProperty,
        goalProperty: config.goalProperty,
      }

      Object.entries(updateProps).forEach(([key, value]) => {
        if (value !== undefined) {
          obj.set(key as keyof TextProps, value as never)
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
        fill: element.fill,
        originX: element.originX,
        originY: element.originY,
        fontFamily: element.fontFamily as string,
        fontSize: Number(element.fontSize),
        iconFont: element.fontFamily as string,
        iconSize: Number(element.fontSize),
        dataProperty: element.dataProperty,
        goalProperty: element.goalProperty,
        metricSymbol: element.metricSymbol,
        topBase: encodeTopBaseForElement(element),
      }
      // 如果 dataProperty 和 goalProperty 都为空，抛出错误
      if (config.dataProperty == null && config.goalProperty == null) {
        const eleId = String(element.id ?? '')
        const eleType = String((element as any).eleType ?? 'data')
        const eleLeft = Math.round(Number((element as any).left ?? config.left ?? 0))
        const eleTop = Math.round(Number((element as any).top ?? config.top ?? 0))
        throw new Error(
          `Invalid element: dataProperty and goalProperty are both null (type=${eleType}, id=${eleId}, left=${eleLeft}, top=${eleTop})`
        )
      }
      return config as IconElementConfig
    },

    decodeConfig(config: IconElementConfig): Partial<FabricElement> {
      return {
        id: config.id,
        eleType: 'icon',
        left: config.left,
        top: config.top,
        fill: config.fill,
        originX: config.originX,
        originY: config.originY,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        iconFont: config.iconFont,
        iconSize: config.iconSize,
        dataProperty: config.dataProperty,
        goalProperty: config.goalProperty,
        metricSymbol: config.metricSymbol,
      }
    },
  },
})
