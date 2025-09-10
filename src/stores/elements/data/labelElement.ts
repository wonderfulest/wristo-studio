import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'

import { FabricText } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import type { LabelElementConfig } from '@/types/elements/data'
import type { FabricElement } from '@/types/element'
import { usePropertiesStore } from '@/stores/properties'

export const useLabelStore = defineStore('labelElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
      defaults: {
        fontSize: 14,
        fill: '#ffffff',
        fontFamily: 'roboto-condensed-regular',
        text: 'Label',
      },
    }
  },
  actions: {
    addElement(config: LabelElementConfig): Promise<FabricElement> {
      const id = nanoid()
      const metric = usePropertiesStore().getMetricByOptions(config)
      const element = new FabricText(metric.enLabel.short, {
        id,
        eleType: 'label',
        left: config.left,
        top: config.top,
        originX: (config.originX ?? 'center') as any,
        originY: (config.originY ?? 'center') as any,
        fill: (config.fill ?? this.defaults.fill) as any,
        fontSize: (config.fontSize ?? this.defaults.fontSize) as any,
        fontFamily: (config.fontFamily ?? this.defaults.fontFamily) as any,
        selectable: true,
        dataProperty: config.dataProperty ?? null,
        goalProperty: config.goalProperty ?? null,
      } as any)

      this.baseStore.canvas?.add(element as any)
      this.layerStore.addLayer(element as any)
      this.baseStore.canvas?.setActiveObject(element as any)
      this.baseStore.canvas?.renderAll()
      return element as any
    },

    updateElement(element: FabricElement, config: Partial<LabelElementConfig> = {}) {
      const canvas = this.baseStore.canvas
      const text = canvas?.getObjects().find((obj: any) => obj.id === element.id)
      if (!canvas || !text) return

      const currentLeft = text.left
      const currentTop = text.top

      const updates: Record<string, any> = {
        text: (config as any).text,
        fill: config.fill,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        left: config.left,
        top: config.top,
        originX: config.originX,
        originY: config.originY,
        metricSymbol: config.metricSymbol,
        metricValue: config.metricValue,
        dataProperty: config.dataProperty,
        goalProperty: config.goalProperty,
      }

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) (key === 'text' ? text.set('text', value) : text.set(key, value))
      })

      if (config.left === undefined) text.set('left', currentLeft)
      if (config.top === undefined) text.set('top', currentTop)

      text.setCoords()
      canvas.requestRenderAll?.()
    },

    encodeConfig(element: FabricElement): LabelElementConfig {
      if (!element) throw new Error('Invalid element')
      const config = {
        id: element.id ?? '',
        eleType: 'label',
        left: element.left,
        top: element.top,
        originX: element.originX as 'left' | 'center' | 'right',
        originY: element.originY as 'top' | 'center' | 'bottom',
        fill: (element.fill as string) ?? '#ffffff',
        fontSize: Number(element.fontSize ?? 14),
        fontFamily: (element.fontFamily as string) ?? '',
        dataProperty: (element as any).dataProperty ?? undefined,
        goalProperty: (element as any).goalProperty ?? undefined,
        metricSymbol: (element as any).metricSymbol ?? undefined,
        metricValue: (element as any).metricValue ?? undefined,
      }
      return config as LabelElementConfig
    },

    decodeConfig(config: LabelElementConfig): Partial<FabricElement> {
      const element = {
        id: config.id,
        eleType: 'label',
        left: config.left,
        top: config.top,
        originX: config.originX,
        originY: config.originY,
        fill: config.fill,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        dataProperty: config.dataProperty,
        goalProperty: config.goalProperty,
        metricSymbol: config.metricSymbol,
        metricValue: config.metricValue,
      } 
      return element as Partial<FabricElement>
    },
  },
})
