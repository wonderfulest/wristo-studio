import { defineStore } from 'pinia'
import { useCanvasStore } from '@/stores/canvasStore'
import { FabricText } from 'fabric'
import type { IndicatorElementConfig } from '@/types/elements'
import type { FabricElement } from '@/types/element'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { useLayerStore } from '@/stores/layerStore'
import { useIconFontStrategyStore } from '@/stores/iconFontStrategyStore'
import { nanoid } from 'nanoid'

export const useNotificationStore = defineStore('notificationElement', {
  state: () => {
    const canvasStore = useCanvasStore()
    const layerStore = useLayerStore()
    const iconFontStrategyStore = useIconFontStrategyStore()

    return {
      canvas: canvasStore.canvas,
      layerStore,
      iconFontStrategyStore,
    }
  },

  actions: {
    addElement(config: IndicatorElementConfig) {
      if (!this.canvas) throw new Error('Canvas is not initialized')

      const strategy = this.iconFontStrategyStore
      if (strategy.currentIconFontSize === -1) {
        strategy.setIconFontSize(config.fontSize)
      } else {
        config.fontSize = strategy.currentIconFontSize
      }
      if (!strategy.currentIconFontSlug) {
        strategy.setIconFontSlug(config.fontFamily)
      } else {
        config.fontFamily = strategy.currentIconFontSlug
      }
      const id = config.id ?? nanoid()
      const notificationIcon = new FabricText('\u0025', {
        id,
        eleType: 'notification',
        left: config.left,
        top: config.top,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        fill: config.fill,
        selectable: true,
        hasControls: false,
        hasBorders: true,
        evented: true,
        originX: 'center',
        originY: 'center',
      } as Partial<import('fabric').TextProps & import('@/types/element').FabricElement>)

      notificationIcon.set('text', '\u0025')
      this.canvas.add(notificationIcon)
      this.layerStore.addLayer(notificationIcon as any)
      this.canvas.setActiveObject(notificationIcon)
      this.canvas.renderAll()
      return notificationIcon
    },

    updateElement(element: any, options: Partial<IndicatorElementConfig> = {}) {
      if (!element) return

      if (options.fill !== undefined) {
        element.set('fill', options.fill)
      }

      if (options.fontFamily !== undefined) {
        element.set('fontFamily', options.fontFamily)
      }

      if (options.fontSize !== undefined) {
        void this.iconFontStrategyStore.requestUpdateIconFontSize(element, options.fontSize)
      }

      if (options.left !== undefined) {
        element.set('left', options.left)
      }

      if (options.top !== undefined) {
        element.set('top', options.top)
      }

      element.setCoords?.()
      this.canvas?.renderAll()
    },

    updateNotificationStatus(status: boolean) {
      void status
    },

    encodeConfig(element: FabricElement): IndicatorElementConfig {
      const config: Partial<IndicatorElementConfig> = {
        eleType: 'notification',
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
