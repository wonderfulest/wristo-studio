import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { FabricText } from 'fabric'

export const useAlarmsStore = defineStore('alarmsElement', {
  state: () => ({
    elements: []
  }),

  actions: {
    addElement(config = {}) {
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
        originY: 'center'
      })

      alarmsIcon.set('text', '\u0024')
      baseStore.canvas.add(alarmsIcon)
      baseStore.canvas.setActiveObject(alarmsIcon)
      this.elements.push(alarmsIcon)
      baseStore.canvas.renderAll()
    },

    updateAlarmsStatus(status) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      this.elements.forEach(element => {
        if (element.eleType === 'alarms') {
          element.set('fill', status ? '#ffffff' : '#666666')
          baseStore.canvas.renderAll()
        }
      })
    },
    encodeConfig(element) {
      return {
        type: 'alarms',
        x: element.left,
        y: element.top,
        size: element.fontSize,
        font: element.fontFamily,
        color: element.fill,
      }
    },

    decodeConfig(config) {
      return {
        eleType: 'bluetooth',
        left: config.x,
        top: config.y,
        fontSize: config.size,
        fontFamily: config.font,
        fill: config.color,
      }
    }
  }
}) 