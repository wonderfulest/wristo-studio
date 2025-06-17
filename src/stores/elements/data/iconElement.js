import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { usePropertiesStore } from '@/stores/properties'

import { nanoid } from 'nanoid'
import { FabricText } from 'fabric'
import { getMetricByProperty } from '@/config/settings'
export const useIconStore = defineStore('iconElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    const propertiesStore = usePropertiesStore()

    return {
      baseStore,
      layerStore,
      propertiesStore,
      baseStore
    }
  },

  actions: {
    async addElement(options = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('画布未初始化，无法添加文本元素')
      }
      try {
        const elementId = nanoid()
        const iconOptions = {
          id: elementId,
          eleType: 'icon',
          left: options.left,
          top: options.top,
          fontSize: Number(options.fontSize),
          fill: options.fill,
          fontFamily: options.iconFontFamily,
          originX: options.originX, // 使用 originX 控制对齐方式
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          dataProperty: options.dataProperty,
          goalProperty: options.goalProperty,
        }
        const metric = getMetricByProperty(options.dataProperty, this.propertiesStore.allProperties)
        // 创建文本对象
        const element = new FabricText(metric.icon, iconOptions)

        // 添加到画布
        this.baseStore.canvas.add(element)

        // 添加到图层
        this.layerStore.addLayer(element)

        // 渲染画布
        this.baseStore.canvas.renderAll()

        // 设置为当前选中对象
        this.baseStore.canvas.discardActiveObject()
        this.baseStore.canvas.setActiveObject(element)

        return element
      } catch (error) {
        console.error('创建文本元素失败:', error)
        throw error
      }
    },

    updateElement(element, options) {
      if (!element || !this.baseStore.canvas) return

      try {
        const updates = {}

        if (options.dataProperty !== undefined) {
          const metric = getMetricByProperty(options.dataProperty, this.propertiesStore.allProperties)
          updates.text = metric.icon
          updates.dataProperty = options.dataProperty
          updates.goalProperty = null
        }
        if (options.goalProperty !== undefined) {
          const metric = getMetricByProperty(options.goalProperty, this.propertiesStore.allProperties)
          updates.text = metric.icon
          updates.goalProperty = options.goalProperty
          updates.dataProperty = null
        }

        if (options.fontSize !== undefined) {
          updates.fontSize = Number(options.fontSize)
        }

        if (options.fill !== undefined) {
          updates.fill = options.fill
        }

        if (options.fontFamily !== undefined) {
          updates.fontFamily = options.fontFamily
        }

        if (options.originX !== undefined) {
          updates.originX = options.originX
        }

        if (options.left !== undefined) {
          updates.left = options.left
        }

        if (options.top !== undefined) {
          updates.top = options.top
        }

        element.set(updates)
        element.setCoords()
        this.baseStore.canvas.requestRenderAll()
      } catch (error) {
        console.error('更新图标元素失败:', error)
        throw error
      }
    },

    encodeConfig(element) {
      return {
        type: element.eleType,
        x: Math.round(element.left),
        y: Math.round(element.top),
        originX: element.originX,
        originY: element.originY,
        font: element.fontFamily,
        size: element.fontSize,
        color: element.fill,
        dataProperty: element.dataProperty,
        goalProperty: element.goalProperty,
      }
    },
    decodeConfig(config) {
      return {
        eleType: 'icon',
        left: config.x,
        top: config.y,
        fill: config.color,
        iconFontFamily: config.font,
        fontSize: config.size,
        originX: config.originX,
        originY: config.originY,
        dataProperty: config.dataProperty,
        goalProperty: config.goalProperty,
      }
    }
  }
})
