import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { FabricText } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import type { LabelElementConfig } from '@/types/elements/data'
import type { ElementConfig, FabricElement } from '@/types/element'
import { getMetricByProperty } from '@/config/elements/options/dataTypes'

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
      const metric = getMetricByProperty(config.dataProperty || config.goalProperty || '')
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

    updateElement(element: any, config: Partial<LabelElementConfig> = {}) {
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
        eleType: 'label',
        id: element.id,
        left: Math.round(element.left),
        top: Math.round(element.top),
        originX: element.originX as any,
        originY: element.originY as any,
        fill: (element.fill as any) ?? this.defaults.fill,
        fontSize: (element.fontSize as any) ?? this.defaults.fontSize,
        fontFamily: element.fontFamily as any,
        dataProperty: (element as any).dataProperty ?? null,
        goalProperty: (element as any).goalProperty ?? null,
      } as any
      return config
    },

    decodeConfig(config: ElementConfig): Partial<FabricElement> {
      const result: Partial<FabricElement> = {
        eleType: 'label',
        id: (config as any).id ?? nanoid(),
        left: (config as any).left,
        top: (config as any).top,
        originX: (config as any).originX ?? 'center',
        originY: (config as any).originY ?? 'center',
        fill: (config as any).fill ?? this.defaults.fill,
        fontSize: (config as any).fontSize ?? this.defaults.fontSize,
        fontFamily: ((config as any).fontFamily ?? this.defaults.fontFamily) as string,
        dataProperty: (config as any).dataProperty ?? null,
        goalProperty: (config as any).goalProperty ?? null,
      }
      return result as Partial<FabricElement>
    },
  },
})
