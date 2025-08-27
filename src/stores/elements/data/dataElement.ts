import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { Group, Text } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import type { DataElementConfig } from '@/types/elements/data'
import type { ElementConfig, FabricElement } from '@/types/element'

export const useDataStore = defineStore('dataElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
      defaults: {
        fontSize: 14,
        fill: '#ffffff',
        fontFamily: undefined as string | undefined,
      },
    }
  },
  actions: {
    addElement(config: DataElementConfig): Promise<FabricElement> {
      const id = nanoid()
      const text: any = new Text('data', {
        left: 0,
        top: 0,
        originX: config.originX ?? 'center',
        originY: config.originY ?? 'center',
        fill: config.fill ?? this.defaults.fill,
        fontSize: config.fontSize ?? this.defaults.fontSize,
        fontFamily: config.fontFamily as any,
        selectable: false,
      })

      const group: any = new Group([text], {
        left: config.left,
        top: config.top,
        id,
        eleType: 'data',
        dataProperty: config.dataProperty ?? null,
        goalProperty: config.goalProperty ?? null,
        originX: config.originX ?? 'center',
        originY: config.originY ?? 'center',
      } as any)

      this.baseStore.canvas?.add(group)
      this.layerStore.addLayer(group)
      this.baseStore.canvas?.setActiveObject(group)
      this.baseStore.canvas?.renderAll()
      return group
    },

    updateElement(element: any, config: Partial<DataElementConfig> = {}) {
      const canvas = this.baseStore.canvas
      const group: any = canvas?.getObjects().find((obj: any) => (obj as any).id === element.id)
      if (!canvas || !group) return
      const text = group.item(0) as any

      if (config.fill !== undefined) text.set('fill', config.fill)
      if (config.fontSize !== undefined) text.set('fontSize', config.fontSize)
      if (config.fontFamily !== undefined) text.set('fontFamily', config.fontFamily as any)

      const keys = ['dataProperty', 'goalProperty', 'originX', 'originY'] as const
      keys.forEach((k) => {
        const v = (config as any)[k]
        if (v !== undefined) group.set(k as any, v)
      })

      canvas.requestRenderAll?.()
    },

    encodeConfig(element: FabricElement): ElementConfig {
      if (!element) throw new Error('Invalid element')
      const text: any = element.item?.(0)
      return {
        type: 'data',
        x: Math.round(element.left),
        y: Math.round(element.top),
        fill: text?.fill ?? this.defaults.fill,
        fontSize: text?.fontSize ?? this.defaults.fontSize,
        fontFamily: text?.fontFamily,
        dataProperty: element.dataProperty ?? null,
        goalProperty: element.goalProperty ?? null,
      }
    },

    decodeConfig(config: ElementConfig): DataElementConfig {
      return {
        eleType: 'data',
        left: config.x,
        top: config.y,
        fill: config.fill ?? this.defaults.fill,
        fontSize: config.fontSize ?? this.defaults.fontSize,
        fontFamily: config.fontFamily,
        dataProperty: config.dataProperty ?? null,
        goalProperty: config.goalProperty ?? null,
      }
    },
  },
})
