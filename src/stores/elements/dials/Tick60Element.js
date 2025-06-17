import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { loadSVGFromURL, util } from 'fabric'
import { nanoid } from 'nanoid'
import { Ticks60Options } from '@/config/settings'

// 添加读取 SVG viewBox 的函数
const getSVGViewBoxSize = (svgString) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')
  const svgElement = doc.documentElement
  const viewBox = svgElement.getAttribute('viewBox')
  if (viewBox) {
    const [, , width, height] = viewBox.split(' ').map(Number)
    return { width, height }
  }
  // 如果没有 viewBox，则使用 width 和 height 属性
  const width = Number(svgElement.getAttribute('width')) || 1000
  const height = Number(svgElement.getAttribute('height')) || 1000
  return { width, height }
}

export const useTick60Store = defineStore('tick60Element', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
      moveDx: 0,
      defaultColors: {
        color: '#FFFFFF',
        bgColor: 'transparent'
      },
    }
  },

  actions: {
    async addElement(options = {}) {
      console.log('addElement tick 60', options)
      const id = options.id || nanoid()
      const imageUrl = options.imageUrl || Ticks60Options[0].url
      const fill = options.fill || this.defaultColors.color
      const targetSize = options.targetSize || this.baseStore.WATCH_SIZE
      const loadedSVG = await loadSVGFromURL(imageUrl)
      console.log('loadedSVG', loadedSVG)
      
      // 获取 SVG 的原始尺寸
      const response = await fetch(imageUrl)
      const svgString = await response.text()
      const { width, height } = getSVGViewBoxSize(svgString)
      
      const svgGroup = util.groupSVGElements(loadedSVG.objects)
      svgGroup.set({
        id,
        eleType: 'tick60',
        left: options.left,
        top: options.top,
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: true,
        hasBorders: true,
        imageUrl: imageUrl,
        targetSize: targetSize,
        fill: fill,
        width: 1000,
        height: 1000,
        scaleX: 1,
        scaleY: 1,
      })
      svgGroup.getObjects().forEach(obj => {
        const currentFill = obj.get('fill')
        if (currentFill === 'white' || currentFill === '#FFFFFF') {
          obj.set('fill', 'none')
        } else if (currentFill && currentFill !== 'none') {
          obj.set('fill', fill)
        }
      })
      svgGroup.scaleToWidth(targetSize)
      // 添加移动事件监听
      svgGroup.on('moving', (e) => {
      })
      svgGroup.on('selected', (e) => {
      })
      svgGroup.on('deselected', (e) => {
      })
      svgGroup.setCoords()
      this.baseStore.canvas.add(svgGroup)
      this.layerStore.addLayer(svgGroup)
      this.baseStore.canvas.requestRenderAll()
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(svgGroup)
    },
    async updateElement(element, config) {
      console.log('updateElement tick 60', element, config)
      if (!element) throw new Error('无效的元素')
      if (config.fill) {
        element.set('fill', config.fill)
      }
      element.getObjects().forEach(obj => {
        const currentFill = obj.get('fill')
        if (currentFill && currentFill != 'none') {
          obj.set('fill', config.fill)
        }
      })
      element.setCoords()
      this.baseStore.canvas.requestRenderAll()
    },
    async updateSVG(element, config) {
      if (!this.baseStore.canvas) return
      let svgGroup = this.baseStore.canvas.getObjects().find((obj) => obj.id === element.id)
      if (!svgGroup) return
      
      if (config.imageUrl && config.imageUrl !== svgGroup.imageUrl) {
        // 保存当前元素的所有属性
        const currentProps = {
          left: svgGroup.left,
          top: svgGroup.top,
          width: svgGroup.width,
          height: svgGroup.height,
          scaleX: svgGroup.scaleX,
          scaleY: svgGroup.scaleY,
          angle: svgGroup.angle,
          fill: svgGroup.fill,
          imageUrl: svgGroup.imageUrl
        }

        this.baseStore.canvas.remove(svgGroup)
        const loadedSVG = await loadSVGFromURL(config.imageUrl)
        
        // 获取新 SVG 的原始尺寸
        const response = await fetch(config.imageUrl)
        const svgString = await response.text()
        const { width, height } = getSVGViewBoxSize(svgString)
        
        svgGroup = util.groupSVGElements(loadedSVG.objects)
        
        // 恢复之前保存的属性
        svgGroup.set({
          id: element.id,
          eleType: 'tick60',
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          width: 1000,
          height: 1000,
          scaleX: 1,
          scaleY: 1,
          ...currentProps,
          imageUrl: config.imageUrl
        })

        // 添加到画布
        this.baseStore.canvas.add(svgGroup)
      }

      svgGroup.getObjects().forEach(obj => {
        const currentFill = obj.get('fill')
        if (currentFill === 'white' || currentFill === '#FFFFFF') {
          obj.set('fill', 'none')
        } else if (currentFill && currentFill !== 'none') {
          obj.set('fill', element.fill)
        }
      })

      svgGroup.scaleToWidth(this.baseStore.WATCH_SIZE)
      // 添加移动事件监听
      svgGroup.on('moving', (e) => {
      })
      svgGroup.on('selected', (e) => {
      })
      svgGroup.on('deselected', (e) => {
      })
      
      svgGroup.setCoords()
      this.baseStore.canvas.requestRenderAll()
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(svgGroup)
    },
    encodeConfig(element) {
      if (!element) throw new Error('无效的元素')
      return {
        id: element.id,
        type: 'tick60',
        x: element.left,
        y: element.top,
        height: element.height,
        color: element.fill,
        imageUrl: element.imageUrl,
      }
    },
    decodeConfig(config) {
      return {
        id: config.id,
        eleType: 'tick60',
        left: config.x,
        top: config.y,
        height: config.height,
        fill: config.color,
        imageUrl: config.imageUrl,
      }
    }
  }
})
