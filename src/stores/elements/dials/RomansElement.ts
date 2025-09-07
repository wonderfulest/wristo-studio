import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { loadSVGFromURL, util } from 'fabric'
import { nanoid } from 'nanoid'
import { RomansOptions } from '@/config/settings'

export interface DialElementConfig {
  id?: string
  imageUrl?: string
  fill?: string
  left?: number
  top?: number
  targetSize?: number
}

export const useRomansStore = defineStore('romansElement', {
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
    async addElement(options: DialElementConfig = {}) {
      const id = options.id || nanoid()
      const imageUrl = options.imageUrl || RomansOptions[0].url
      const fill = options.fill || this.defaultColors.color
      const loadedSVG: any = await loadSVGFromURL(imageUrl)
      const svgGroup: any = util.groupSVGElements(loadedSVG.objects)
      svgGroup.set({
        id,
        eleType: 'romans',
        left: options.left,
        top: options.top,
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: true,
        hasBorders: true,
        imageUrl: imageUrl,
        fill: fill,
        width: 1000,
        height: 1000,
        scaleX: 1,
        scaleY: 1,
      })
      svgGroup.getObjects().forEach((obj: any) => {
        const currentFill = obj.get('fill')
        if (currentFill === 'white' || currentFill === '#FFFFFF') {
          obj.set('fill', 'none')
        } else if (currentFill && currentFill !== 'none') {
          obj.set('fill', fill)
        }
      })
      svgGroup.scaleToWidth(this.baseStore.WATCH_SIZE)
      svgGroup.on('moving', () => {})
      svgGroup.on('selected', () => {})
      svgGroup.on('deselected', () => {})
      svgGroup.setCoords()
      this.baseStore.canvas?.add(svgGroup)
      this.layerStore.addLayer(svgGroup)
      this.baseStore.canvas?.requestRenderAll()
      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(svgGroup)
    },
    async updateSVG(element: any, config: DialElementConfig) {
      if (!this.baseStore.canvas) return
      let svgGroup: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.id === element.id)
      if (!svgGroup) return
      
      if (config.imageUrl && config.imageUrl !== svgGroup.imageUrl) {
        const currentProps = {
          left: svgGroup.left,
          top: svgGroup.top,
          scaleX: svgGroup.scaleX,
          scaleY: svgGroup.scaleY,
          angle: svgGroup.angle,
          fill: svgGroup.fill,
          imageUrl: svgGroup.imageUrl
        }

        this.baseStore.canvas.remove(svgGroup)
        const loadedSVG: any = await loadSVGFromURL(config.imageUrl)
        svgGroup = util.groupSVGElements(loadedSVG.objects)
        
        svgGroup.set({
          id: element.id,
          eleType: 'romans',
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          ...currentProps,
          imageUrl: config.imageUrl
        })

        this.baseStore.canvas.add(svgGroup)
      }

      svgGroup.getObjects().forEach((obj: any) => {
        const currentFill = obj.get('fill')
        if (currentFill === 'white' || currentFill === '#FFFFFF') {
          obj.set('fill', 'none')
        } else if (currentFill && currentFill !== 'none') {
          obj.set('fill', element.fill)
        }
      })

      svgGroup.on('moving', () => {})
      svgGroup.on('selected', () => {})
      svgGroup.on('deselected', () => {})
      
      svgGroup.setCoords()
      this.baseStore.canvas.requestRenderAll()
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(svgGroup)
    },

    async updateElement(element: any, config: DialElementConfig) {
      if (!element) throw new Error('Invalid element')
      if (config.fill) {
        element.set('fill', config.fill)
      }
      element.getObjects().forEach((obj: any) => {
        const currentFill = obj.get('fill')
        if (currentFill && currentFill !== 'none') {
          obj.set('fill', config.fill)
        }
      })
      element.setCoords()
      this.baseStore.canvas?.requestRenderAll()
    },
    encodeConfig(element: any) {
      if (!element) throw new Error('Invalid element')
      return {
        id: element.id,
        eleType: 'romans',
        left: element.left,
        top: element.top,
        height: element.height,
        fill: element.fill,
        imageUrl: element.imageUrl,
      }
    },
    decodeConfig(config: any) {
      return {
        id: config.id,
        eleType: 'romans',
        left: config.left,
        top: config.top,
        height: config.height,
        fill: config.fill,
        imageUrl: config.imageUrl,
      }
    }
  }
})
