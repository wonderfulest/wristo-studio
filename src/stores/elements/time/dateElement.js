import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { nanoid } from 'nanoid'
import moment from 'moment'
import { FabricText } from 'fabric'
import { DateFormatOptions } from '@/config/settings'

export const useDateStore = defineStore('dateElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()

    return {
      dateElements: [],
      baseStore,
      layerStore
    }
  },

  actions: {
    formatDate(date, format) {
      if (typeof format === 'number') {
        const formatterOption = DateFormatOptions.find(option => option.value === format)
        if (formatterOption) {
          format = formatterOption.label
        } else {
          format = 'YYYY-MM-DD' // 默认格式
        }
      }
      let formattedDate = moment(date).format(format)
      
      // 应用文本大小写设置
      const textCase = this.baseStore.textCase
      
      if (textCase === 1) { // 全大写
        formattedDate = formattedDate.toUpperCase()
      } else if (textCase === 2) { // 全小写
        formattedDate = formattedDate.toLowerCase()
      } else if (textCase === 3) { // 驼峰式
        // 将每个单词的首字母大写
        formattedDate = formattedDate.replace(/\b\w/g, c => c.toUpperCase())
      }
      
      return formattedDate
    },

    async addElement(options = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('画布未初始化，无法添加日期元素')
      }

      try {
        const elementId = options.id || nanoid()
        // 确保 dateFormatter 是数字
        const dateFormatterValue = parseInt(options.dateFormatter)
        const formatterOption = DateFormatOptions.find((option) => option.value === dateFormatterValue)
        
        if (!formatterOption) {
          console.error('无法找到日期格式器:', options.dateFormatter)
          throw new Error('无效的日期格式器')
        }
        
        const formatter = formatterOption.label
        let text = this.formatDate(new Date(), formatter)
        
        // 添加更新方法以响应全局文本大小写设置变化
        const updateTextCase = () => {
          try {
            // 注意：DateFormatOptions 中的 value 是数字，而元素的 formatter 可能是字符串
            // 将 formatter 转换为数字进行比较
            const formatterValue = parseInt(element.formatter)
            const formatterOption = DateFormatOptions.find((option) => option.value === formatterValue)
            
            if (!formatterOption) {
              console.error('找不到日期格式器:', element.formatter, '类型:', typeof element.formatter)
              // 尝试直接使用 formatter 值
              const now = new Date()
              const newText = this.formatDate(now, element.formatter)
              element.set('text', newText)
              return
            }
            
            const formatter = formatterOption.label
            
            // 生成新文本
            const newText = this.formatDate(new Date(), formatter)
            
            // 更新元素文本
            element.set('text', newText)
            
            // 强制重新渲染
            this.baseStore.canvas.renderAll()
          } catch (error) {
            console.error('更新日期元素文本时出错:', error)
          }
        }
        const attr = {
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
          hasBorders: true
        }
        // 创建文本对象
        const element = new FabricText(text, attr)

        this.baseStore.canvas.add(element)

        // 添加到图层 store
        const layer = this.layerStore.addLayer(element)

        // 设置为当前选中对象
        this.baseStore.canvas.setActiveObject(element)
        
        // 将更新函数添加到元素上，以便在全局调用
        element.updateTextCase = updateTextCase
        
        // 监听 baseStore 中的 textCase 变化
        const unwatch = this.baseStore.$subscribe((mutation, state) => {
          // 检查是否是 textCase 属性变化
          if (mutation.type === 'direct' && 
              mutation.storeId === 'baseStore' && 
              mutation.payload && 
              'textCase' in mutation.payload) {
            // 当全局文本大小写设置变化时更新文本
            setTimeout(() => {
              updateTextCase()
            }, 0)
          }
        })
        
        // 将监听器存储在元素上，以便在元素被删除时可以移除监听器
        element.textCaseUnwatch = unwatch

        this.baseStore.canvas.renderAll()

        return element
      } catch (error) {
        console.error('创建日期元素失败:', error)
        throw error
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
          obj.set(key, updateProps[key])
        }
      })

      // 如果有格式化器变化，更新文本
      if (config.formatter !== undefined || obj.get('formatter') !== undefined) {
        const formatterValue = parseInt(config.formatter) || parseInt(obj.get('formatter'))
        const formatterOption = DateFormatOptions.find(option => option.value === formatterValue)
        if (formatterOption) {
          obj.set('text', this.formatDate(new Date(), formatterOption.label))
        }
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
        type: 'date',
        x: Math.round(element.left),
        y: Math.round(element.top),
        originX: element.originX,
        originY: element.originY,
        font: element.fontFamily,
        size: element.fontSize,
        color: element.fill,
        formatter: element.formatter
      }
    },
    decodeConfig(config) {
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
        // 日期元素特有属性
        dateFormatter: config.formatter,
      }
    }
  }
})
