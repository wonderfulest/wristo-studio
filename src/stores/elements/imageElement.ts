import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { useBaseStore } from '../baseStore'
import { useLayerStore } from '../layerStore'
import { Image as FabricImage } from 'fabric'

interface ImageOptions {
  src?: string
  left?: number
  top?: number
  originX?: string
  originY?: string
  scaleX?: number
  scaleY?: number
}

export const useImageElementStore = defineStore('imageElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
    }
  },

  actions: {
    async addElement(options: ImageOptions = {}) {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized')
      }

      return new Promise((resolve, reject) => {
        const imgElement = new Image()

        imgElement.onload = () => {
          const canvasSize = this.baseStore.WATCH_SIZE
          const canvas = this.baseStore.canvas!
          const scale = Math.min(canvasSize / imgElement.width, canvasSize / imgElement.height)

          const image = new FabricImage(imgElement, {
            id: nanoid(),
            eleType: 'image',
            left: options.left ?? canvasSize / 2,
            top: options.top ?? canvasSize / 2,
            originX: options.originX ?? 'center',
            originY: options.originY ?? 'center',
            scaleX: options.scaleX ?? scale,
            scaleY: options.scaleY ?? scale,
            selectable: false,
            hasControls: false,
            hasBorders: true,
          } as any)

          canvas.add(image as any)
          canvas.moveObjectTo(image as any, 1)

          ;(image as any).elementId = (image as any).id

          this.layerStore.addLayer(image as any)

          canvas.renderAll()

          canvas.setActiveObject(image as any)

          resolve(image)
        }

        imgElement.onerror = () => {
          reject(new Error('Failed to load image'))
        }

        if (options.src) {
          imgElement.src = options.src
        } else {
          const canvas = document.createElement('canvas')
          canvas.width = this.baseStore.WATCH_SIZE
          canvas.height = this.baseStore.WATCH_SIZE
          imgElement.src = canvas.toDataURL()
        }
      })
    },

    encodeConfig(element: any) {
      if (!element || !this.baseStore.canvas) {
        throw new Error('Invalid element or canvas not initialized')
      }

      return {
        type: 'image',
        src: element.getSrc?.(),
        x: Math.round(element.left),
        y: Math.round(element.top),
        widthRatio: (Math.round(element.width * element.scaleX) * 2) / this.baseStore.WATCH_SIZE,
        heightRatio: (Math.round(element.height * element.scaleY) * 2) / this.baseStore.WATCH_SIZE,
        originX: element.originX,
        originY: element.originY,
      }
    },

    decodeConfig(config: any) {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas not initialized')
      }

      const center = this.baseStore.canvas.getCenter?.()
      return {
        ...config,
        left: config.x,
        top: config.y,
        center,
      }
    },
  },
})
