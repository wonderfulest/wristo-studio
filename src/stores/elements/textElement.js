import { defineStore } from 'pinia'
import { useBaseStore } from '../baseStore'
import { useLayerStore } from '../layerStore'
import { nanoid } from 'nanoid'
import { FabricText } from 'fabric'

export const useTextStore = defineStore('textElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()

    return {
      baseStore,
      layerStore
    }
  },

  actions: {
    async addElement(options = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('画布未初始化，无法添加文本元素')
      }

      try {
        // 创建文本对象
        const element = new FabricText(options.text || '新文本', {
          id: nanoid(),
          eleType: 'text',
          left: options.left,
          top: options.top,
          fontSize: Number(options.size) || 36,
          fill: options.textColor || '#FFFFFF',
          fontFamily: options.fontFamily,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          originX: options.originX || 'center',
          originY: options.originY || 'center',
        })

        // 添加到画布
        this.baseStore.canvas.add(element)
        // 将 id 添加到 fabric 对象中
        element.elementId = element.id

        // 添加到图层
        this.layerStore.addLayer(element)

        // 渲染画布
        this.baseStore.canvas.renderAll()

        // 设置为当前选中对象
        this.baseStore.canvas.setActiveObject(element)

        return element
      } catch (error) {
        console.error('创建文本元素失败:', error)
        throw error
      }
    },
    encodeConfig(element) {
      if (!element) {
        throw new Error('无效的元素')
      }
      return {
        type: 'text',
        x: Math.round(element.left),
        y: Math.round(element.top),
        originX: element.originX,
        originY: element.originY,
        font: element.fontFamily || '',
        size: element.fontSize || '-1',
        color: element.fill || '',
        formatter: element.formatter || ''
      }
    }
  }
})
