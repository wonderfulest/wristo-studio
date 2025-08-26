import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { nanoid } from 'nanoid'
import moment from 'moment'
import { Text as FabricText } from 'fabric'
import { DateFormatOptions } from '@/config/settings'
import { ElementConfig, FabricElement } from '@/types/element'

interface DateAddOptions {
  id?: string
  left?: number
  top?: number
  originX?: string
  originY?: string
  fontSize?: number | string
  color?: string
  fontFamily?: string
  dateFormatter?: number | string
}

export const useDateStore = defineStore('dateElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()

    return {
      dateElements: [] as any[],
      baseStore,
      layerStore,
    }
  },

  actions: {
    formatDate(date: Date, format: string | number) {
      if (typeof format === 'number') {
        const formatterOption = DateFormatOptions.find((option) => option.value === format)
        if (formatterOption) {
          format = formatterOption.label
        } else {
          format = 'YYYY-MM-DD'
        }
      }
      let formattedDate = moment(date).format(format)

      const textCase = (this.baseStore as any).textCase

      if (textCase === 1) {
        formattedDate = formattedDate.toUpperCase()
      } else if (textCase === 2) {
        formattedDate = formattedDate.toLowerCase()
      } else if (textCase === 3) {
        formattedDate = formattedDate.replace(/\b\w/g, (c) => c.toUpperCase())
      }

      return formattedDate
    },

    async addElement(options: DateAddOptions = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add date element')
      }

      try {
        const elementId = options.id || nanoid()
        const dateFormatterValue = parseInt(String(options.dateFormatter))
        const formatterOption = DateFormatOptions.find((option) => option.value === dateFormatterValue)

        if (!formatterOption) {
          console.error('Invalid date formatter:', options.dateFormatter)
          throw new Error('Invalid date formatter')
        }

        const formatter = formatterOption.label
        let text = this.formatDate(new Date(), formatter)

        const element = new FabricText(text, {
          eleType: 'date',
          id: elementId,
          left: options.left,
          top: options.top,
          originX: options.originX,
          originY: options.originY,
          fontSize: Number(options.fontSize),
          fill: options.color,
          fontFamily: options.fontFamily,
          formatter: options.dateFormatter,
          selectable: true,
          hasControls: true,
          hasBorders: true,
        } as any)

        const updateTextCase = () => {
          try {
            const formatterValue = parseInt(String((element as any).formatter))
            const formatterOption2 = DateFormatOptions.find((option) => option.value === formatterValue)

            if (!formatterOption2) {
              console.error('Date formatter not found:', (element as any).formatter, 'type:', typeof (element as any).formatter)
              const now = new Date()
              const newText = this.formatDate(now as Date, (element as any).formatter)
              ;(element as any).set('text', newText)
              return
            }

            const fmt = formatterOption2.label
            const newText = this.formatDate(new Date(), fmt)
            ;(element as any).set('text', newText)
            this.baseStore.canvas?.renderAll()
          } catch (error) {
            console.error('Error updating date element text:', error)
          }
        }

        this.baseStore.canvas.add(element as any)
        this.layerStore.addLayer(element as any)
        this.baseStore.canvas.setActiveObject(element as any)

        ;(element as any).updateTextCase = updateTextCase

        const unwatch = (this.baseStore as any).$subscribe((mutation: any) => {
          if (
            mutation.type === 'direct' &&
            mutation.storeId === 'baseStore' &&
            mutation.payload &&
            'textCase' in mutation.payload
          ) {
            setTimeout(() => {
              updateTextCase()
            }, 0)
          }
        })

        ;(element as any).textCaseUnwatch = unwatch

        this.baseStore.canvas.renderAll()

        return element
      } catch (error) {
        console.error('Failed to create date element:', error)
        throw error
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
          obj.set(key, updateProps[key])
        }
      })

      if (config.formatter !== undefined || obj.get('formatter') !== undefined) {
        const formatterValue = parseInt(String(config.formatter ?? obj.get('formatter')))
        const formatterOption3 = DateFormatOptions.find((option) => option.value === formatterValue)
        if (formatterOption3) {
          obj.set('text', this.formatDate(new Date(), formatterOption3.label))
        }
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
    encodeConfig(element: any): ElementConfig {
      return {
        id: element.id,
        type: 'date',
        x: Math.round(element.left),
        y: Math.round(element.top),
        originX: element.originX,
        originY: element.originY,
        font: element.fontFamily,
        size: element.fontSize,
        color: element.fill,
        formatter: element.formatter,
      }
    },
    decodeConfig(config: ElementConfig): Partial<FabricElement> {
      return {
        id: config.id,
        eleType: 'date',
        left: config.x,
        top: config.y,
        color: config.color,
        fontFamily: config.font,
        fontSize: config.size,
        originX: config.originX,
        originY: config.originY,
        dateFormatter: config.formatter,
      }
    },
  },
})
