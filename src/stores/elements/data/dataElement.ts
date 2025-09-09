import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { FabricText } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import type { DataElementConfig } from '@/types/elements/data'
import type { FabricElement } from '@/types/element'
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
        dataProperty: config.dataProperty ?? undefined,
        goalProperty: config.goalProperty ?? undefined,
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
        metricSymbol: config.metricSymbol,
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

    encodeConfig(element: FabricElement): DataElementConfig {
      if (!element) throw new Error('Invalid element')
      const config: DataElementConfig = {
        eleType: 'data',
        id: String(element.id ?? ''),
        left: Math.round(element.left),
        top: Math.round(element.top),
        originX: (element.originX as any) ?? 'center',
        originY: (element.originY as any) ?? 'center',
        fill: String((element.fill as any) ?? '#ffffff'),
        fontSize: Number((element.fontSize as any) ?? 14),
        fontFamily: String((element.fontFamily as any) ?? 'roboto-condensed-regular'),
        dataProperty: (element as any).dataProperty ?? null,
        goalProperty: (element as any).goalProperty ?? null,
        metricSymbol: String((element as any).metricSymbol ?? ''),
      }
      return config
    },

    decodeConfig(config: DataElementConfig): Partial<FabricElement> {
      const result: Partial<FabricElement> = {
        eleType: 'data',
        id: config.id ?? nanoid(),
        left: config.left,
        top: config.top,
        originX: config.originX,
        originY: config.originY,
        fill: config.fill,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        dataProperty: config.dataProperty ?? null,
        goalProperty: config.goalProperty ?? null,
        metricSymbol: config.metricSymbol ?? '',
      }
      return result as Partial<FabricElement>
    },
  },
})
