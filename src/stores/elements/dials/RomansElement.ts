import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Image as FabricImage } from 'fabric'
import { nanoid } from 'nanoid'
import { RomansOptions } from '@/config/settings'
import { analogAssetApi } from '@/api/wristo/analogAsset'

export interface DialElementConfig {
  id?: string
  imageUrl?: string
  assetId?: number
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
      // Prefer provided imageUrl; if missing but assetId exists, fetch by assetId
      let imageUrl = options.imageUrl
      if (!imageUrl && options.assetId) {
        try {
          const res = await analogAssetApi.get(options.assetId)
          imageUrl = res.data?.file?.url || res.data?.file?.previewUrl || RomansOptions[0].url
        } catch (e) {
          imageUrl = RomansOptions[0].url
        }
      }
      imageUrl = imageUrl || RomansOptions[0].url
      const img: any = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' } as any)
      let group: any = img
      group.set({
        id,
        eleType: 'romans',
        left: options.left,
        top: options.top,
        scaleX: 1,
        scaleY: 1,
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: false,
        hasBorders: true,
        imageUrl: imageUrl,
        assetId: options.assetId,
      })
      const gw = group.width || 0
      const gh = group.height || 0
      if (gw > 0 && gh > 0) {
        const scale = this.baseStore.WATCH_SIZE / Math.max(gw, gh)
        group.set({ scaleX: scale, scaleY: scale })
      } else {
        group.scaleToWidth(this.baseStore.WATCH_SIZE)
      }
      group.on('moving', () => {})
      group.on('selected', () => {})
      group.on('deselected', () => {})
      group.setCoords()
      this.baseStore.canvas?.add(group)
      this.layerStore.addLayer(group)
      this.baseStore.canvas?.requestRenderAll()
      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(group)
      return group
    },
    async updateSVG(element: any, config: DialElementConfig) {
      if (!this.baseStore.canvas) return
      let group: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.id === element.id)
      if (!group) return
      
      if (config.imageUrl && config.imageUrl !== group.imageUrl) {
        const prevLeft = group.left
        const prevTop = group.top
        const prevAngle = group.angle
        this.baseStore.canvas.remove(group)
        const img: any = await FabricImage.fromURL(config.imageUrl, { crossOrigin: 'anonymous' } as any)
        group = img
        group.set({
          id: element.id,
          eleType: 'romans',
          originX: 'center',
          originY: 'center',
          left: prevLeft,
          top: prevTop,
          angle: prevAngle,
          imageUrl: config.imageUrl,
          selectable: true,
          hasControls: true,
          hasBorders: true,
        })
        const gw = group.width || 0
        const gh = group.height || 0
        if (gw > 0 && gh > 0) {
          const scale = this.baseStore.WATCH_SIZE / Math.max(gw, gh)
          group.set({ scaleX: scale, scaleY: scale })
        } else {
          group.scaleToWidth(this.baseStore.WATCH_SIZE)
        }
        this.baseStore.canvas.add(group)
      }
      if (typeof config.assetId === 'number') {
        group.assetId = config.assetId
      }
      group.on('moving', () => {})
      group.on('selected', () => {})
      group.on('deselected', () => {})
      group.setCoords()
      this.baseStore.canvas.requestRenderAll()
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(group)
    },

    async updateElement(element: any, _config: DialElementConfig) {
      if (!element) throw new Error('Invalid element')
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
        originX: element.originX,
        originY: element.originY,
        height: element.height,
        fill: element.fill,
        imageUrl: element.imageUrl,
        assetId: (element as any).assetId,
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
        assetId: config.assetId,
      }
    }
  }
})
