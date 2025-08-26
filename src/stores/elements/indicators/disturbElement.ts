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

export const useDisturbStore = defineStore('disturbElement', {
  state: () => ({
    elements: [] as any[],
  }),

  actions: {
    addElement(config: IndicatorConfig = {}) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      const disturbIcon = new FabricText('\u0021', {
        eleType: 'disturb',
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

      disturbIcon.set('text', '\u0021')
      baseStore.canvas.add(disturbIcon as any)
      baseStore.canvas.setActiveObject(disturbIcon as any)
      this.elements.push(disturbIcon)
      baseStore.canvas.renderAll()
    },

    updateDisturbStatus(status: boolean) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      this.elements.forEach((element: any) => {
        if (element.eleType === 'disturb') {
          element.set('fill', status ? '#ffffff' : '#666666')
          baseStore.canvas?.renderAll()
        }
      })
    },

    encodeConfig(element: any) {
      return {
        type: 'disturb',
        x: element.left,
        y: element.top,
        size: element.fontSize,
        font: element.fontFamily,
        color: element.fill,
      }
    },

    decodeConfig(config: any) {
      return {
        eleType: 'disturb',
        left: config.x,
        top: config.y,
        fontSize: config.size,
        fontFamily: config.font,
        fill: config.color,
      }
    },
  },
})
