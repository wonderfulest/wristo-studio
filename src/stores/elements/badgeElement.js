import { defineStore } from 'pinia'
import { useBaseStore } from '../baseStore'
import { useLayerStore } from '../layerStore'
import { useBaseElementStore } from './baseElement'
import { nanoid } from 'nanoid'
import { FabricText, Rect, Group } from 'fabric'
import { elementAttribute } from '@/config/elements'

export const useBadgeStore = defineStore('badgeElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    const baseElement = useBaseElementStore()

    return {
      baseStore,
      layerStore,
      baseElement
    }
  },

  actions: {
    async addElement(options = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('画布未初始化，无法添加文本元素')
      }

      try {
        const text = new FabricText(options.text || '80%', {
          eleType: 'badge-text',
          fontSize: Number(options.fontSize),
          fill: options.textColor,
          backgroundColor: options.backgroundColor,
          fontFamily: options.fontFamily,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          originX: 'center', // 使用 originX 控制对齐方式
          originY: 'center'
        })
        const rect = new Rect({
          eleType: 'badge-bg',
          width: Number(options.width),
          height: Number(options.height),
          fill: options.backgroundColor,
          rx: options.borderRadius,
          ry: options.borderRadius,
          originX: 'center',
          originY: 'center'
        })
        const group = new Group([rect, text], {
          id: nanoid(),
          eleType: 'badge',
          metricSymbol: options.metricSymbol,
          left: options.left,
          top: options.top,
          originX: 'center',
          originY: 'center'
        })

        // 添加到画布
        this.baseStore.canvas.add(group)

        // 添加到图层
        this.layerStore.addLayer(group)

        // 渲染画布
        this.baseStore.canvas.renderAll()

        // 设置为当前选中对象
        this.baseStore.canvas.setActiveObject(group)

        return group
      } catch (error) {
        console.error('创建文本元素失败:', error)
        throw error
      }
    },
    encodeConfig(element) {
      if (!element) {
        throw new Error('无效的元素')
      }
      let textElement = element._objects.find((obj) => obj.eleType === 'badge-text')
      let bgElement = element._objects.find((obj) => obj.eleType === 'badge-bg')
      return {
        type: 'badge',
        x: Math.round(element.left),
        y: Math.round(element.top),
        width: bgElement.width,
        height: bgElement.height,
        originX: element.originX,
        originY: element.originY,
        font: textElement.fontFamily,
        size: textElement.fontSize,
        color: textElement.fill,
        borderRadius: bgElement.rx,
        bgColor: bgElement.fill,
        metricSymbol: element.metricSymbol
      }
    },
    decodeConfig(config) {
      const decodedConfig = {
        ...elementAttribute,
        ...config,
        left: config.x,
        top: config.y,
        width: config.width,
        height: config.height,
        borderRadius: config.borderRadius,
        backgroundColor: config.bgColor,
        metricSymbol: config.metricSymbol,
        textColor: config.color,
        fontFamily: config.font,
        fontSize: config.size
      }
      return decodedConfig
    }
  }
})
