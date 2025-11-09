import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { FabricText } from 'fabric'
import type { IndicatorElementConfig } from '@/types/elements'
import type { FabricElement } from '@/types/element'

export const useBluetoothStore = defineStore('bluetoothElement', {
  state: () => ({
  }),

  actions: {
    addElement(config: IndicatorElementConfig) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) throw new Error('Canvas is not initialized')

      const bluetoothIcon = new FabricText('\u0022', {
        eleType: 'bluetooth',
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
      } as Partial<import('fabric').TextProps & import('@/types/element').FabricElement>)

      bluetoothIcon.set('text', '\u0022')
      baseStore.canvas.add(bluetoothIcon)
      baseStore.canvas.setActiveObject(bluetoothIcon)
      baseStore.canvas.renderAll()
      return bluetoothIcon
    },

    updateBluetoothStatus(status: boolean) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return
      void status
    },

    encodeConfig(element: Partial<FabricElement>): IndicatorElementConfig {
      const config: Partial<IndicatorElementConfig> = {
        eleType: 'bluetooth',
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
        eleType: 'bluetooth',
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
