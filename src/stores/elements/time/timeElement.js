import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { nanoid } from 'nanoid'
import moment from 'moment'
import { FabricText } from 'fabric'
import { TimeFormatOptions } from '@/config/settings'

export const useTimeStore = defineStore('timeStore', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      timeElements: [],
      updateInterval: null,
      baseStore,
      layerStore
    }
  },

  actions: {
    formatTime(date, formatter) {
      // 如果format是数字，从TimeFormatOptions中查找对应的格式化字符串
      let format = '--' // 默认格式
      const formatterOption = TimeFormatOptions.find(option => option.value == formatter)
      if (formatterOption) {
        format = formatterOption.label
      }
      return moment(date).format(format)
    },
    async addElement(options = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('画布未初始化，无法添加时间元素')
      }
      try {
        let text = this.formatTime(new Date(),  options.formatter)
        const timeOptions = {
          eleType: 'time',
          id: options.id || nanoid(),
          left: options.left,
          top: options.top,
          originX: options.originX,
          originY: options.originY,
          fontSize: Number(options.fontSize),
          fill: options.fill,
          fontFamily: options.fontFamily,
          formatter: options.formatter,
          selectable: true,
          hasControls: true,
          hasBorders: true,
        }
        const element = new FabricText(text, timeOptions)
        this.baseStore.canvas.add(element)
        this.layerStore.addLayer(element)
        this.baseStore.canvas.setActiveObject(element)
        // 记录时间元素
        try { this.timeElements.push(element) } catch {}
        this.baseStore.canvas.renderAll()
        return element
      } catch (error) {
        console.error('创建时间元素失败:', error)
        throw error
      }
    },
    /**
     * 使用指定时间刷新所有时间文本元素
     * @param {Date} date
     */
    updateByTime(date) {
      if (!this.baseStore.canvas) return
      const canvas = this.baseStore.canvas
      const objects = canvas.getObjects ? canvas.getObjects() : []
      let changed = false
      objects.forEach((obj) => {
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
    updateElement(element, config) {
      if (!this.baseStore.canvas) return
      const obj = this.baseStore.canvas.getObjects().find((o) => o.id === element.id)
      if (!obj) return

      // 保存当前位置
      const currentLeft = obj.left
      const currentTop = obj.top

      // 更新属性
      const updateProps = {
        fontSize: config.fontSize,
        fill: config.fill,
        fontFamily: config.fontFamily,
        formatter: config.formatter,
        originX: config.originX,
        originY: config.originY
      }
 
      // 过滤掉未定义的属性
      Object.keys(updateProps).forEach(key => {
        if (updateProps[key] !== undefined) {
          // 特殊处理颜色属性
          if (key === 'fill' && updateProps[key]) {
            obj.set(key, updateProps[key])
            // 强制更新文本颜色
            const currentFormatter = obj.get('formatter')
            obj.set('text', this.formatTime(new Date(), currentFormatter))
          } else {
            obj.set(key, updateProps[key])
          }
        }
      })

      // 如果有格式化器变化，更新文本
      if (config.formatter !== undefined) {
        obj.set('text', this.formatTime(new Date(), config.formatter))
      }

      // 恢复位置
      if (config.left === undefined) {
        obj.set('left', currentLeft)
      }
      if (config.top === undefined) {
        obj.set('top', currentTop)
      }

      obj.setCoords()
      this.baseStore.canvas.renderAll()
    },
    encodeConfig(element) {
      return {
        id: element.id,
        type: 'time',
        x: element.left,
        y: element.top,
        originX: element.originX,
        originY: element.originY,
        font: element.fontFamily,
        size: element.fontSize,
        color: element.fill,
        formatter: +element.formatter,
      }
    },
    decodeConfig(config) {
      return {
        id: config.id,
        type: 'time',
        left: config.x,
        top: config.y,
        fontSize: config.size,
        fontFamily: config.font,
        fill: config.color,
        originX: config.originX,
        originY: config.originY,
        // 时间元素特有属性
        formatter: +config.formatter,
      }
    }
  }
})
