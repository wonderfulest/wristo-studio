import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { nanoid } from 'nanoid'
import moment from 'moment'
import { FabricText, TextProps } from 'fabric'
import { TimeFormatOptions } from '@/config/settings'
import type { FabricElement } from '@/types/element'
import type { TimeElementConfig } from '@/types/elementConfig'
import { TimeElementOptions } from '@/types/elementOptions'


export const useTimeStore = defineStore('timeStore', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      timeElements: [] as any[],
      updateInterval: null as number | null,
      baseStore,
      layerStore,
    }
  },

  actions: {
    formatTime(date: Date, formatter: number | string | undefined) {
      let format = '--'
      const formatterOption = TimeFormatOptions.find((option) => option.value == formatter)
      if (formatterOption) {
        format = formatterOption.label
      }
      return moment(date).format(format)
    },
    async addElement(options: TimeElementConfig): Promise<FabricText> {
      console.log('add time element', options)
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add time element')
      }
      try {
        const text = this.formatTime(new Date(), options.formatter)
        const timeOptions: Partial<TimeElementOptions> = {
          id: options.id || nanoid(),
          eleType: 'time',
          left: options.x,
          top: options.y,
          originX: options.originX as 'center' | 'left' | 'right',
          originY: options.originY as 'center' | 'top' | 'bottom',
          fill: options.fill ?? '#ffffff',
          fontSize: Number(options.fontSize ?? 14),
          fontFamily: options.fontFamily ?? 'roboto-condensed-regular',
          formatter: options.formatter,
        }
        const element = new FabricText(text, timeOptions as TimeElementOptions)
        this.baseStore.canvas.add(element as any)
        this.layerStore.addLayer(element as any)
        this.baseStore.canvas.setActiveObject(element as any)
        try {
          this.timeElements.push(element)
        } catch {}
        this.baseStore.canvas.renderAll()
        return element
      } catch (error) {
        console.error('Failed to create time element:', error)
        throw error
      }
    },
    updateByTime(date: Date) {
      if (!this.baseStore.canvas) return
      const canvas: any = this.baseStore.canvas
      const objects = canvas.getObjects ? canvas.getObjects() : []
      let changed = false
      objects.forEach((obj: any) => {
        if (obj && obj.eleType === 'time') {
          const fmt = obj.get ? obj.get('formatter') : obj.formatter
          const txt = this.formatTime(date, fmt)
          if (obj.get && obj.set) {
            obj.set('text', txt)
          } else if (obj.text !== undefined) {
            obj.text = txt
          }
          changed = true
        }
      })
      if (changed) {
        canvas.renderAll && canvas.renderAll()
      }
    },
    updateElement(element: any, config: any) {
      if (!this.baseStore.canvas) return
      const obj: any = this.baseStore.canvas.getObjects().find((o: any) => o.id === element.id)
      if (!obj) return

      const currentLeft = obj.left
      const currentTop = obj.top

      const updateProps: Record<string, any> = {
        fontSize: config.fontSize,
        fill: config.fill,
        fontFamily: config.fontFamily,
        formatter: config.formatter,
        originX: config.originX,
        originY: config.originY,
      }

      Object.keys(updateProps).forEach((key) => {
        if (updateProps[key] !== undefined) {
          if (key === 'fill' && updateProps[key]) {
            obj.set(key, updateProps[key])
            const currentFormatter = obj.get('formatter')
            obj.set('text', this.formatTime(new Date(), currentFormatter))
          } else {
            obj.set(key, updateProps[key])
          }
        }
      })

      if (config.formatter !== undefined) {
        obj.set('text', this.formatTime(new Date(), config.formatter))
      }

      if (config.left === undefined) {
        obj.set('left', currentLeft)
      }
      if (config.top === undefined) {
        obj.set('top', currentTop)
      }

      obj.setCoords()
      this.baseStore.canvas.renderAll()
    },
    encodeConfig(element: FabricElement): TimeElementConfig {
      const config = {
        id: element.id || '',
        type: 'time',
        x: element.left || 0,
        y: element.top || 0,
        originX: element.originX || 'center',
        originY: element.originY || 'center',
        fontFamily: element.fontFamily || 'roboto-condensed-regular',
        fontSize: element.fontSize || 14,
        fill: element.fill || '#ffffff',
        formatter: element.formatter ? +element.formatter : 0,
      }
      return config as TimeElementConfig
    },
    decodeConfig(config: TimeElementConfig): Partial<FabricElement> {
      const elementConfig = {
        id: config.id,
        type: 'time',
        left: config.x,
        top: config.y,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        fill: config.fill,
        originX: config.originX,
        originY: config.originY,
        formatter: config.formatter,
      }
      return elementConfig as Partial<FabricElement>
    },
  },
})
