import { defineStore } from 'pinia'
import { FabricText } from 'fabric'
import { nanoid } from 'nanoid'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { usePropertiesStore } from '@/stores/properties'

import { getMetricByProperty } from '@/config/settings'

export const useDataStore = defineStore('dataElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    const propertiesStore = usePropertiesStore()

    return {
      baseStore,
      layerStore,
      propertiesStore,
      elements: {},
      progressMap: {}
    }
  },

  actions: {
    async addElement(options = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('画布未初始化，无法添加文本元素')
      }
      try {
        const elementId = nanoid()
        const dataOptions = {
          id: elementId,
          eleType: 'data',
          left: options.left,
          top: options.top,
          fontSize: Number(options.fontSize),
          fill: options.fill,
          fontFamily: options.fontFamily,
          originX: options.originX,
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          dataProperty: options.dataProperty,
          goalProperty: options.goalProperty,
        }
        const metric = getMetricByProperty(options.dataProperty || options.goalProperty, this.propertiesStore.allProperties)
        
        // 创建文本对象
        const element = new FabricText(metric.defaultValue, dataOptions)

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
        console.error('创建数据元素失败:', error)
        throw error
      }
    },

    updateElement(element, options) {
      if (!element || !this.baseStore.canvas) return

      try {
        const updates = {}

        if (options.dataProperty) {
          const metric = getMetricByProperty(options.dataProperty, this.propertiesStore.allProperties)
          updates.text = metric.defaultValue
          updates.dataProperty = options.dataProperty
          updates.goalProperty = null
        }
        if (options.goalProperty) {
          const metric = getMetricByProperty(options.goalProperty, this.propertiesStore.allProperties)
          updates.text = metric.defaultValue
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
        console.error('更新数据元素失败:', error)
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
        eleType: 'data',
        left: config.x,
        top: config.y,
        fill: config.color,
        fontFamily: config.font,
        fontSize: config.size,
        originX: config.originX,
        originY: config.originY,
        dataProperty: config.dataProperty,
        goalProperty: config.goalProperty,
      }
    }
  }
})

