import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Image as FabricImage } from 'fabric'
import { nanoid } from 'nanoid'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'

import type { DialElementConfig } from './RomansElement'

export const useTick12Store = defineStore('tick12Element', {
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
          imageUrl = res.data?.file?.url || res.data?.file?.previewUrl
        } catch (e) {
          console.error('Failed to fetch tick12 asset:', e)
        }
      }
      if (!imageUrl) {
        const analogAssetStore = useAnalogAssetStore()
        await analogAssetStore.loadAssets('tick12')
        imageUrl = analogAssetStore.getFirstUrl('tick12')
      }

      if (!imageUrl) {
        console.error('No active tick12 assets available for default tick12.')
        return
      }
      const img: any = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' } as any)
      let svgGroup: any = img

      svgGroup.set({
        id,
        eleType: 'tick12',
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
      // Scale to fit within WATCH_SIZE x WATCH_SIZE while preserving aspect ratio and transparent margins
      const gw = svgGroup.width || 0
      const gh = svgGroup.height || 0
      if (gw > 0 && gh > 0) {
        const scale = this.baseStore.WATCH_SIZE / Math.max(gw, gh)
        svgGroup.set({ scaleX: scale, scaleY: scale })
      } else {
        svgGroup.scaleToWidth(this.baseStore.WATCH_SIZE)
      }
      svgGroup.on('moving', () => {})
      svgGroup.on('selected', () => {})
      svgGroup.on('deselected', () => {})
      svgGroup.setCoords()
      this.baseStore.canvas?.add(svgGroup)
      this.layerStore.addLayer(svgGroup)
      this.baseStore.canvas?.requestRenderAll()
      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(svgGroup)
      return svgGroup
    },
    async updateElement(element: any, _config: DialElementConfig) {
      if (!element) throw new Error('Invalid element')
      element.setCoords()
      this.baseStore.canvas?.requestRenderAll()
    },
    async updateSVG(element: any, config: DialElementConfig) {
      console.log('[Tick12.updateSVG] called', { elementId: element?.id, imageUrl: config?.imageUrl })
      if (!this.baseStore.canvas) {
        console.warn('[Tick12.updateSVG] canvas not ready')
        return
      }
      const objects: any[] = this.baseStore.canvas.getObjects() as any[]
      let svgGroup: any = objects.find((obj: any) => obj.id === element.id)
      console.log('[Tick12.updateSVG] found group?', { found: !!svgGroup, objectsCount: objects.length })
      if (!svgGroup) return
      
      if (config.imageUrl && config.imageUrl !== svgGroup.imageUrl) {
        const prevLeft = svgGroup.left
        const prevTop = svgGroup.top
        const prevAngle = svgGroup.angle
        this.baseStore.canvas.remove(svgGroup)
        const img: any = await FabricImage.fromURL(config.imageUrl, { crossOrigin: 'anonymous' } as any)
        svgGroup = img
        svgGroup.set({
          id: element.id,
          eleType: 'tick12',
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

        // Scale to fit within WATCH_SIZE x WATCH_SIZE while preserving aspect ratio and transparent margins
        const gw = svgGroup.width || 0
        const gh = svgGroup.height || 0
        if (gw > 0 && gh > 0) {
          const scale = this.baseStore.WATCH_SIZE / Math.max(gw, gh)
          svgGroup.set({ scaleX: scale, scaleY: scale })
        } else {
          svgGroup.scaleToWidth(this.baseStore.WATCH_SIZE)
        }

        this.baseStore.canvas.add(svgGroup)
      } else {
        console.log('[Tick12.updateSVG] imageUrl unchanged, skipping replace')
      }

      if (typeof config.assetId === 'number') {
        svgGroup.assetId = config.assetId
      }

      svgGroup.on('moving', () => {})
      svgGroup.on('selected', () => {})
      svgGroup.on('deselected', () => {})
      
      svgGroup.setCoords()
      this.baseStore.canvas.requestRenderAll()
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(svgGroup)
    },
    encodeConfig(element: any) {
      if (!element) throw new Error('Invalid element')
      return {
        id: element.id,
        eleType: 'tick12',
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
        eleType: 'tick12',
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
