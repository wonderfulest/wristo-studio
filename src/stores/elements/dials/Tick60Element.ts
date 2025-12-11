import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Image as FabricImage } from 'fabric'
import { nanoid } from 'nanoid'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'

import type { DialElementConfig } from './RomansElement'

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
    async addElement(options: DialElementConfig = {}) {
      const id = options.id || nanoid()
      // Prefer provided imageUrl; if missing but assetId exists, fetch by assetId
      let imageUrl = options.imageUrl
      if (!imageUrl && (options as any).assetId) {
        try {
          const res = await analogAssetApi.get((options as any).assetId as number)
          imageUrl = res.data?.file?.url || res.data?.file?.previewUrl
        } catch (e) {
          console.error('Failed to fetch tick60 asset:', e)
        }
      }
      if (!imageUrl) {
        const analogAssetStore = useAnalogAssetStore()
        await analogAssetStore.loadAssets('tick60')
        imageUrl = analogAssetStore.getFirstUrl('tick60')
      }

      if (!imageUrl) {
        console.error('No active tick60 assets available for default tick60.')
        return
      }
      const img: any = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' } as any)
      let group: any = img

      group.set({
        id,
        eleType: 'tick60',
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
        assetId: (options as any).assetId,
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
    async updateElement(element: any, _config: DialElementConfig) {
      if (!element) throw new Error('Invalid element')
      element.setCoords()
      this.baseStore.canvas?.requestRenderAll()
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
          eleType: 'tick60',
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
      if (typeof (config as any).assetId === 'number') {
        group.assetId = (config as any).assetId
      }

      group.on('moving', () => {})
      group.on('selected', () => {})
      group.on('deselected', () => {})
      
      group.setCoords()
      this.baseStore.canvas.requestRenderAll()
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(group)
    },
    encodeConfig(element: any) {
      if (!element) throw new Error('Invalid element')
      return {
        id: element.id,
        eleType: 'tick60',
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
        eleType: 'tick60',
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
