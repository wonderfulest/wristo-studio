import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { FabricText } from 'fabric'
import type { IndicatorElementConfig } from '@/types/elements'
import type { FabricElement } from '@/types/element'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'

export const useBluetoothStore = defineStore('bluetoothElement', {
  state: () => ({
  }),

  actions: {
    addElement(config: IndicatorElementConfig) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) throw new Error('Canvas is not initialized')
      console.log('add bluetooth element', config, )
      if ((baseStore as any).currentIconFontSize == -1) {
        (baseStore as any).currentIconFontSize = config.fontSize
      } else {
        config.fontSize = (baseStore as any).currentIconFontSize
      }
      if ((baseStore as any).currentIconFontSlug == '') {
        (baseStore as any).currentIconFontSlug = config.fontFamily
      } else {
        config.fontFamily = (baseStore as any).currentIconFontSlug
      }

      const bluetoothIcon = new FabricText('\u0022', {
        eleType: 'bluetooth',
        left: config.left,
        top: config.top,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
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

    updateElement(element: any, options: Partial<IndicatorElementConfig> = {}) {
      if (!element) return

      const baseStore = useBaseStore()

      if (options.fill !== undefined) {
        element.set('fill', options.fill)
      }

      if (options.fontFamily !== undefined) {
        element.set('fontFamily', options.fontFamily)
      }

      if (options.fontSize !== undefined) {
        // 复用 baseStore 统一的图标字体缩放逻辑
        if (baseStore.canvas) {
          void baseStore.requestUpdateIconFontSize?.(element, options.fontSize)
        } else {
          element.set('fontSize', options.fontSize)
        }
      }

      if (options.left !== undefined) {
        element.set('left', options.left)
      }

      if (options.top !== undefined) {
        element.set('top', options.top)
      }

      element.setCoords?.()
      baseStore.canvas?.renderAll()
    },

    updateBluetoothStatus(status: boolean) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return
      void status
    },

    encodeConfig(element: FabricElement): IndicatorElementConfig {
      const config: Partial<IndicatorElementConfig> = {
        eleType: 'bluetooth',
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
