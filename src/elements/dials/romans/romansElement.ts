import { defineStore } from 'pinia'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { Image as FabricImage } from 'fabric'
import { nanoid } from 'nanoid'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'

export interface DialElementConfig {
  id?: string
  imageUrl: string | null
  assetId: number | null
  fill?: string
  left?: number
  top?: number
  targetSize?: number
}

export const useRomansStore = defineStore('romansElement', {
  state: () => {
    const canvasStore = useCanvasStore()
    const layerStore = useLayerStore()
    return {
      canvas: canvasStore.canvas,
      layerStore,
      moveDx: 0,
      defaultColors: {
        color: '#FFFFFF',
        bgColor: 'transparent'
      },
    }
  },
  actions: {
    async addElement(options: DialElementConfig) {
      const id = options.id || nanoid()
      // Prefer provided imageUrl; if missing but assetId exists, fetch by assetId
      let imageUrl = options.imageUrl
      if (!imageUrl && options.assetId) {
        try {
          const res = await analogAssetApi.get(options.assetId)
          imageUrl = res.data?.file?.url || res.data?.file?.previewUrl || null
        } catch (e) {
          console.error('Failed to fetch romans asset:', e)
          imageUrl = null
        }
      }
      if (!imageUrl) {
        const analogAssetStore = useAnalogAssetStore()
        await analogAssetStore.loadAssets('romans')
        imageUrl = analogAssetStore.getFirstUrl('romans')
        options.assetId = analogAssetStore.getFirstId('romans')
      }

      if (!imageUrl) {
        console.error('No active romans assets available for default romans.')
        return
      }
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
        const scale = this.canvas?.getWidth() / Math.max(gw, gh)
        group.set({ scaleX: scale, scaleY: scale })
      } else {
        group.scaleToWidth(this.canvas?.getWidth())
      }
      group.on('moving', () => {})
      group.on('selected', () => {})
      group.on('deselected', () => {})
      group.setCoords()
      this.canvas?.add(group)
      this.layerStore.addLayer(group)
      this.canvas?.requestRenderAll()
      this.canvas?.discardActiveObject()
      this.canvas?.setActiveObject(group)
      return group
    },
    async updateSVG(element: any, config: DialElementConfig) {
      if (!this.canvas) return
      let group: any = this.canvas.getObjects().find((obj: any) => obj.id === element.id)
      if (!group) return
      
      if (config.imageUrl && config.imageUrl !== group.imageUrl) {
        const prevLeft = group.left
        const prevTop = group.top
        const prevAngle = group.angle
        this.canvas?.remove(group)
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
          hasControls: false,
          hasBorders: true,
        })
        const gw = group.width || 0
        const gh = group.height || 0
        if (gw > 0 && gh > 0) {
          const scale = this.canvas?.getWidth() / Math.max(gw, gh)
          group.set({ scaleX: scale, scaleY: scale })
        } else {
          group.scaleToWidth(this.canvas?.getWidth())
        }
        this.canvas?.add(group)
      }
      if (typeof config.assetId === 'number') {
        group.assetId = config.assetId
      }
      group.on('moving', () => {})
      group.on('selected', () => {})
      group.on('deselected', () => {})
      group.setCoords()
      this.canvas?.requestRenderAll()
      this.canvas?.discardActiveObject()
      this.canvas?.setActiveObject(group)
    },

    async updateElement(element: any, _config: DialElementConfig) {
      if (!element) throw new Error('Invalid element')
      element.setCoords()
      this.canvas?.requestRenderAll()
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
