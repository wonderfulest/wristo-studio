import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { FabricText } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import type { DataElementConfig } from '@/types/elements/data'
import type { ElementConfig, FabricElement } from '@/types/element'
import { usePropertiesStore } from '@/stores/properties'


export const useDataStore = defineStore('dataElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
    }
  },
  actions: {
    addElement(config: DataElementConfig): Promise<FabricElement> {
      const id = nanoid()
      const metric = usePropertiesStore().getMetricByOptions(config)
      const element = new FabricText(metric.defaultValue, {
        id,
        eleType: 'data',
        left: config.left,
        top: config.top,
        originX: (config.originX ?? 'center') as any,
        originY: (config.originY ?? 'center') as any,
        fill: config.fill as any,
        fontSize: config.fontSize as any,
        fontFamily: config.fontFamily as any,
        selectable: true,
        dataProperty: config.dataProperty ?? null,
        goalProperty: config.goalProperty ?? null,
        metricSymbol: (config as any).metricSymbol ?? '',
      } as any)

      this.baseStore.canvas?.add(element as any)
      this.layerStore.addLayer(element as any)
      this.baseStore.canvas?.setActiveObject(element as any)
      this.baseStore.canvas?.renderAll()
      return element as any
    },

    updateElement(element: any, config: Partial<DataElementConfig> = {}) {
      const canvas = this.baseStore.canvas
      const obj: any = canvas?.getObjects().find((o: any) => (o as any).id === element.id)
      if (!canvas || !obj) return

      const currentLeft = obj.left
      const currentTop = obj.top

      const updateProps: Record<string, any> = {
        fill: config.fill,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        originX: config.originX,
        originY: config.originY,
        left: config.left,
        top: config.top,
        dataProperty: config.dataProperty,
        goalProperty: config.goalProperty,
      }

      Object.keys(updateProps).forEach((key) => {
        const value = updateProps[key]
        if (value !== undefined) obj.set(key, value)
      })

      if (config.left === undefined) obj.set('left', currentLeft)
      if (config.top === undefined) obj.set('top', currentTop)

      obj.setCoords()
      canvas.renderAll()
    },

    encodeConfig(element: FabricElement): ElementConfig {
      if (!element) throw new Error('Invalid element')
      const config: ElementConfig = {
        eleType: 'data',
        id: element.id,
        left: Math.round(element.left),
        top: Math.round(element.top),
        originX: element.originX as any,
        originY: element.originY as any,
        fill: element.fill as any,
        fontSize: element.fontSize as any,
        fontFamily: element.fontFamily as any,
        metricSymbol: (element as any).metricSymbol ?? '',
        dataProperty: (element as any).dataProperty ?? null,
        goalProperty: (element as any).goalProperty ?? null,
      }
      return config as ElementConfig
    },

    decodeConfig(config: ElementConfig): Partial<FabricElement> {
      const result: Partial<FabricElement> = {
        eleType: 'data',
        id: (config as any).id ?? nanoid(),
        left: config.left,
        top: config.top,
        originX: (config as any).originX ?? 'center',
        originY: (config as any).originY ?? 'center',
        fill: config.fill,
        fontSize: config.fontSize,
        fontFamily: (config.fontFamily) as string,
        metricSymbol: (config as any).metricSymbol ?? '',
        dataProperty: (config as any).dataProperty ?? null,
        goalProperty: (config as any).goalProperty ?? null,
      }
      return result as Partial<FabricElement>
    },
  },
})
