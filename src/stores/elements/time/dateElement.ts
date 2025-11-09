import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { nanoid } from 'nanoid'
import moment from 'moment'
import { Text as FabricText } from 'fabric'
import { DateFormatOptions } from '@/config/settings'
import { FabricElement } from '@/types/element'
import type { DateElementConfig } from '@/types/elements'

// 统一与 timeElement.ts 的配置类型：使用 DateElementConfig

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
    formatDate(date: Date, formatter: number) {
      const formatterOption = DateFormatOptions.find((option) => option.value === formatter)
      const format = formatterOption ? formatterOption.label : 'YYYY-MM-DD'
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

    async addElement(options: DateElementConfig): Promise<FabricText> {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add date element')
      }

      try {
        const elementId = options.id || nanoid()
        const dateFormatterValue = parseInt(String(options.formatter))
        const formatterOption = DateFormatOptions.find((option) => option.value === dateFormatterValue)

        if (!formatterOption) {
          console.error('Invalid date formatter:', options.formatter)
          throw new Error('Invalid date formatter')
        }

        let text = this.formatDate(new Date(), dateFormatterValue)

        const element = new FabricText(text, {
          eleType: 'date',
          id: elementId,
          left: options.left,
          top: options.top,
          originX: options.originX as 'center' | 'left' | 'right',
          originY: options.originY as 'center' | 'top' | 'bottom',
          fontSize: Number(options.fontSize),
          fill: options.fill,
          fontFamily: options.fontFamily,
          formatter: options.formatter,
          hasControls: false,
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

            const newText = this.formatDate(new Date(), formatterValue)
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

        return element as unknown as FabricText
      } catch (error) {
        console.error('Failed to create date element:', error)
        throw error
      }
    },

    updateElement(element: FabricElement, config: DateElementConfig) {
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
          obj.set('text', this.formatDate(new Date(), formatterValue))
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
    encodeConfig(element: FabricElement): DateElementConfig {
      const config: DateElementConfig = {
        id: String(element.id ?? ''),
        eleType: 'date',
        left: Math.round(element.left),
        top: Math.round(element.top),
        originX: (element.originX as unknown) as 'center' | 'left' | 'right',
        originY: (element.originY as unknown) as 'center' | 'top' | 'bottom',
        fontFamily: element.fontFamily || 'roboto-condensed-regular',
        fontSize: element.fontSize || 14,
        fill: element.fill as string,
        formatter: Number((element as any).formatter ?? 0),
      }
      return config as DateElementConfig
    },
    decodeConfig(config: DateElementConfig): Partial<FabricElement> {
      const elementConfig: Partial<FabricElement> = {
        id: config.id,
        eleType: 'date',
        left: config.left,
        top: config.top,
        originX: config.originX,
        originY: config.originY,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        fill: config.fill,
        formatter: config.formatter,
      }
      return elementConfig as Partial<FabricElement>
    },
  },
})
