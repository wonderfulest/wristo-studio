import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { FabricText } from 'fabric'

export const useDisturbStore = defineStore('disturbElement', {
  state: () => ({
    elements: []
  }),

  actions: {
    addElement(config = {}) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      const disturbIcon = new FabricText('\u0021', {
        eleType: 'disturb',
        left: config.left || 100,
        top: config.top || 100,
        fontSize: config.fontSize || 24,
        fontFamily: config.fontFamily || 'Yoghurt-One',
        fill: config.color || '#ffffff',
        selectable: true,
        evented: true,
        originX: 'center',
        originY: 'center'
      })

      disturbIcon.set('text', '\u0021')
      baseStore.canvas.add(disturbIcon)
      baseStore.canvas.setActiveObject(disturbIcon)
      this.elements.push(disturbIcon)
      baseStore.canvas.renderAll()
    },

    updateDisturbStatus(status) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      this.elements.forEach(element => {
        if (element.eleType === 'disturb') {
          element.set('fill', status ? '#ffffff' : '#666666')
          baseStore.canvas.renderAll()
        }
      })
    },

    encodeConfig(element) {
      return {
        type: 'disturb',
        x: element.left,
        y: element.top,
        size: element.fontSize,
        font: element.fontFamily,
        color: element.fill,
      }
    },

    decodeConfig(config) {
      return {
        eleType: 'disturb',
        left: config.x,
        top: config.y,
        fontSize: config.size,
        fontFamily: config.font,
        fill: config.color,
      }
    }
  }
}) 