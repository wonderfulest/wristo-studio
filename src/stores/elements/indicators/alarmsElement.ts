import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { FabricText } from 'fabric'
import { IndicatorElementConfig } from '@/types/elements'
import { FabricElement } from '@/types/element'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'

export const useAlarmsStore = defineStore('alarmsElement', {
  state: () => ({
  }),

  actions: {
    addElement(config: IndicatorElementConfig) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) throw new Error('Canvas is not initialized')

      const alarmsIcon = new FabricText('\u0024', {
        eleType: 'alarms',
        left: config.left,
        top: config.top,
        fontSize: (baseStore as any).currentIconFontSize ?? config.fontSize,
        fontFamily: (baseStore as any).currentIconFontSlug ?? config.fontFamily,
        fill: config.fill,
        selectable: true,
        hasControls: false,
        hasBorders: true,
        evented: true,
        originX: config.originX,
        originY: config.originY,
      } as unknown as Record<string, unknown>)

      alarmsIcon.set('text', '\u0024')
      baseStore.canvas.add(alarmsIcon)
      baseStore.canvas.setActiveObject(alarmsIcon)
      baseStore.canvas.renderAll()
      return alarmsIcon
    },

    encodeConfig(element: FabricElement): IndicatorElementConfig {
      const config: Partial<IndicatorElementConfig> = {
        eleType: 'alarms',
        id: element.id,
        left: element.left,
        top: element.top,
        originX: element.originX,
        originY: element.originY,
        fontSize: element.fontSize,
        fontFamily: element.fontFamily,
        fill: element.fill as string,
        topBase: encodeTopBaseForElement(element),
      }
      return config as IndicatorElementConfig
    },

    decodeConfig(config: IndicatorElementConfig): Partial<FabricElement> {
      return {
        eleType: 'alarms',
        id: config.id,
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
