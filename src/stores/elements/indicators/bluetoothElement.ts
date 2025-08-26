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

export const useBluetoothStore = defineStore('bluetoothElement', {
  state: () => ({
    elements: [] as any[],
  }),

  actions: {
    addElement(config: IndicatorConfig = {}) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      const options: any = {
        eleType: 'bluetooth',
        left: config.left,
        top: config.top,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        fill: config.fill,
        selectable: true,
        evented: true,
        originX: 'center',
        originY: 'center',
      }

      const bluetoothIcon = new FabricText('\u0022', options)

      bluetoothIcon.set('text', '\u0022')

      baseStore.canvas.add(bluetoothIcon as any)
      baseStore.canvas.setActiveObject(bluetoothIcon as any)

      this.elements.push(bluetoothIcon)

      baseStore.canvas.renderAll()
    },

    updateBluetoothStatus(status: boolean) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      this.elements.forEach((element: any) => {
        if (element.eleType === 'bluetooth') {
          element.set('fill', status ? '#ffffff' : '#666666')
          baseStore.canvas?.renderAll()
        }
      })
    },

    encodeConfig(element: any) {
      return {
        type: 'bluetooth',
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
