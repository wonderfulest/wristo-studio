import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { FabricText } from 'fabric'
import type { IndicatorElementConfig } from '@/types/elements'
import type { FabricElement } from '@/types/element'

export const useNotificationStore = defineStore('notificationElement', {
  state: () => ({
  }),

  actions: {
    addElement(config: IndicatorElementConfig) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      const notificationIcon = new FabricText('\u0025', {
        eleType: 'notification',
        left: config.left,
        top: config.top,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        fill: config.fill,
        selectable: true,
        evented: true,
        originX: 'center',
        originY: 'center',
      } as any)

      notificationIcon.set('text', '\u0025')
      baseStore.canvas.add(notificationIcon as any)
      baseStore.canvas.setActiveObject(notificationIcon as any)
      baseStore.canvas.renderAll()
    },

    updateNotificationStatus(status: boolean) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return
      void status
    },

    encodeConfig(element: Partial<FabricElement>): IndicatorElementConfig {
      const config: Partial<IndicatorElementConfig> = {
        eleType: 'notification',
        id: element.id,
        left: element.left,
        top: element.top,
        originX: element.originX,
        originY: element.originY,
        fontSize: element.fontSize,
        fontFamily: element.fontFamily,
        fill: element.fill,
      }
      return config as IndicatorElementConfig
    },

    decodeConfig(config: IndicatorElementConfig): Partial<FabricElement> {
      return {
        eleType: 'notification',
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
