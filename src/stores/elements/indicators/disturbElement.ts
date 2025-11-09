import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { FabricText } from 'fabric'
import type { IndicatorElementConfig } from '@/types/elements'
import type { FabricElement } from '@/types/element'


export const useDisturbStore = defineStore('disturbElement', {
  state: () => ({}),

  actions: {
    addElement(config: IndicatorElementConfig) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) throw new Error('Canvas is not initialized')

      const disturbIcon = new FabricText('\u0021', {
        eleType: 'disturb',
        left: config.left,
        top: config.top,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        fill: config.fill,
        selectable: true,
        hasControls: false,
        hasBorders: true,
        evented: true,
        originX: 'center',
        originY: 'center',
      } as any)

      disturbIcon.set('text', '\u0021')
      baseStore.canvas?.add(disturbIcon as any)
      baseStore.canvas?.setActiveObject(disturbIcon as any)
      baseStore.canvas?.renderAll()
      return disturbIcon as any
    },

    updateDisturbStatus(status: boolean) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) throw new Error('Canvas is not initialized')
      void status
    },

    encodeConfig(element: Partial<FabricElement>): IndicatorElementConfig {
      const config: Partial<IndicatorElementConfig> = {
        eleType: 'disturb',
        id: element.id,
        left: element.left,
        top: element.top,
        originX: element.originX,
        originY: element.originY,
        fontSize: element.fontSize,
        fontFamily: element.fontFamily,
        fill: (element.fill ?? undefined) as unknown as string | undefined,
      }
      return config as IndicatorElementConfig
    },

    decodeConfig(config: IndicatorElementConfig): Partial<FabricElement> {
      return {
        eleType: 'disturb',
        id: (config as any).id,
        left: config.left,
        top: config.top,
        originX: config.originX,
        originY: config.originY,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        fill: config.fill,
      }
    },
  },
})
