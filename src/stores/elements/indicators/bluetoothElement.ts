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
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        fill: config.fill,
        selectable: true,
        evented: true,
        originX: config.originX,
        originY: config.originY,
      } as any)

      bluetoothIcon.set('text', '\u0022')
      baseStore.canvas.add(bluetoothIcon as any)
      baseStore.canvas.setActiveObject(bluetoothIcon as any)
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
        fill: (element.fill ?? undefined) as unknown as string | undefined,
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
