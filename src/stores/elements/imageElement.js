import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { useBaseStore } from '../baseStore'
import { useLayerStore } from '../layerStore'
import { FabricImage, FabricText } from 'fabric'

export const useImageElementStore = defineStore('imageElement', {
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
        throw new Error('Canvas is not initialized')
      }

      return new Promise((resolve, reject) => {
        const imgElement = new Image()

        imgElement.onload = () => {
          // Calculate scaling to fit canvas
          const canvasSize = this.baseStore.WATCH_SIZE
          const scale = Math.min(canvasSize / imgElement.width, canvasSize / imgElement.height)

          const image = new FabricImage(imgElement, {
            id: nanoid(),
            eleType: 'image',
            left: options.left || canvasSize / 2,
            top: options.top || canvasSize / 2,
            originX: options.originX || 'center',
            originY: options.originY || 'center',
            scaleX: options.scaleX || scale,
            scaleY: options.scaleY || scale,
            selectable: false,
            hasControls: true,
            hasBorders: true
          })

          // Add to canvas
          this.baseStore.canvas.add(image)

          // Move image to second-to-last layer
          this.baseStore.canvas.moveObjectTo(image, 1)

          // Add element ID to fabric object
          image.elementId = image.id

          // Add to layer manager
          this.layerStore.addLayer(image)

          // Render canvas
          this.baseStore.canvas.renderAll()

          // Set as active object
          this.baseStore.canvas.setActiveObject(image)

          resolve(image)
        }

        imgElement.onerror = () => {
          reject(new Error('Failed to load image'))
        }

        // Set image source based on options
        if (options.src) {
          imgElement.src = options.src
        } else {
          // Create empty canvas for placeholder
          const canvas = document.createElement('canvas')
          canvas.width = this.baseStore.WATCH_SIZE
          canvas.height = this.baseStore.WATCH_SIZE
          imgElement.src = canvas.toDataURL()
        }
      })
    },

    encodeConfig(element) {
      if (!element || !this.baseStore.canvas) {
        throw new Error('Invalid element or canvas not initialized')
      }

      return {
        type: 'image',
        src: element.getSrc(),
        x: Math.round(element.left),
        y: Math.round(element.top),
        widthRatio: (Math.round(element.width * element.scaleX) * 2) / this.baseStore.WATCH_SIZE,
        heightRatio: (Math.round(element.height * element.scaleY) * 2) / this.baseStore.WATCH_SIZE,
        originX: element.originX,
        originY: element.originY
      }
    },

    decodeConfig(config) {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas not initialized')
      }

      const center = this.baseStore.canvas.getCenter()
      return {
        ...config,
        left: config.x,
        top: config.y
      }
    }
  }
})
