import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { Text as FabricText } from 'fabric'

interface IndicatorConfig {
  left?: number
  top?: number
  fontSize?: number
  fontFamily?: string
  fill?: string
}

export const useAlarmsStore = defineStore('alarmsElement', {
  state: () => ({
    elements: [] as any[],
  }),

  actions: {
    addElement(config: IndicatorConfig = {}) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      const alarmsIcon = new FabricText('\u0024', {
        eleType: 'alarms',
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

      alarmsIcon.set('text', '\u0024')
      baseStore.canvas.add(alarmsIcon as any)
      baseStore.canvas.setActiveObject(alarmsIcon as any)
      this.elements.push(alarmsIcon)
      baseStore.canvas.renderAll()
    },

    updateAlarmsStatus(status: boolean) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      this.elements.forEach((element: any) => {
        if (element.eleType === 'alarms') {
          element.set('fill', status ? '#ffffff' : '#666666')
          baseStore.canvas?.renderAll()
        }
      })
    },

    encodeConfig(element: any) {
      return {
        type: 'alarms',
        x: element.left,
        y: element.top,
        size: element.fontSize,
        font: element.fontFamily,
        color: element.fill,
      }
    },

    decodeConfig(config: any) {
      return {
        eleType: 'bluetooth',
        left: config.x,
        top: config.y,
        fontSize: config.size,
        fontFamily: config.font,
        fill: config.color,
      }
    },
  },
})
