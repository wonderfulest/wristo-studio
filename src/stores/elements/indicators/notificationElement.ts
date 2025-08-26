import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { Text as FabricText } from 'fabric'

interface IndicatorConfig {
  left?: number
  top?: number
  fontSize?: number
  fontFamily?: string
  color?: string
}

export const useNotificationStore = defineStore('notificationElement', {
  state: () => ({
    elements: [] as any[],
  }),

  actions: {
    addElement(config: IndicatorConfig = {}) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      const notificationIcon = new FabricText('\u0025', {
        eleType: 'notification',
        left: config.left ?? 100,
        top: config.top ?? 100,
        fontSize: config.fontSize ?? 24,
        fontFamily: config.fontFamily ?? 'Yoghurt-One',
        fill: config.color ?? '#ffffff',
        selectable: true,
        evented: true,
        originX: 'center',
        originY: 'center',
      } as any)

      notificationIcon.set('text', '\u0025')
      baseStore.canvas.add(notificationIcon as any)
      baseStore.canvas.setActiveObject(notificationIcon as any)
      this.elements.push(notificationIcon)
      baseStore.canvas.renderAll()
    },

    updateNotificationStatus(status: boolean) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      this.elements.forEach((element: any) => {
        if (element.eleType === 'notification') {
          element.set('fill', status ? '#ffffff' : '#666666')
          baseStore.canvas?.renderAll()
        }
      })
    },

    encodeConfig(element: any) {
      return {
        type: 'notification',
        x: element.left,
        y: element.top,
        size: element.fontSize,
        font: element.fontFamily,
        color: element.fill,
      }
    },

    decodeConfig(config: any) {
      return {
        eleType: 'notification',
        left: config.x,
        top: config.y,
        fontSize: config.size,
        fontFamily: config.font,
        fill: config.color,
      }
    },
  },
})
