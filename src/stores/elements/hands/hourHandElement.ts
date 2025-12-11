import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Image as FabricImage, type FabricObject } from 'fabric'
import { nanoid } from 'nanoid'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import { HandElementConfig } from '@/types/elements'
import type { FabricElement } from '@/types/element'


export const useHourHandStore = defineStore('hourHandElement', {
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
      defaultAngle: 0,
      updateTimer: null as number | null
    }
  },

  actions: {
    rotateHand(img: any, angle: number) {
      img.set({ angle })
      img.setCoords()
      this.baseStore.canvas?.requestRenderAll()
    },

    getHourHandAngle(time?: Date) {
      const now = time || new Date()
      const hours = now.getHours() % 12
      const minutes = now.getMinutes()
      const seconds = now.getSeconds()
      const ms = now.getMilliseconds()
      // hour hand: 30 deg per hour; 0.5 deg per minute; 0.5/60 per second; include ms for smoothness
      const angle = (hours + minutes / 60 + seconds / 3600 + ms / 3_600_000) * 30
      return angle
    },

    async addElement(config: HandElementConfig) {
      const id = config.id || nanoid()
      // Prefer provided imageUrl; if missing but assetId exists, fetch by assetId
      let imageUrl = config.imageUrl
      if (!imageUrl && config.assetId) {
        try {
          const res = await analogAssetApi.get(config.assetId)
          imageUrl = res.data?.file?.url || res.data?.file?.previewUrl
        } catch (e) {
          console.error('Failed to fetch hour hand asset:', e)
        }
      }
      if (!imageUrl) {
        const analogAssetStore = useAnalogAssetStore()
        await analogAssetStore.loadAssets('hour')
        imageUrl = analogAssetStore.getFirstUrl('hour')
      }

      if (!imageUrl) {
        console.error('No active hour hand assets available for default hour hand.')
        return
      }
      const img: any = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' } as any)
      const options = {
        id,
        eleType: 'hourHand',
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: false,
        hasBorders: true,
        angle: this.getHourHandAngle(),
        left: config.left ?? this.baseStore.WATCH_SIZE / 2,
        top: config.top ?? this.baseStore.WATCH_SIZE / 2,
        imageUrl: imageUrl,
        assetId: config.assetId,
      }
      img.set(options)
      const iw = img.width || 0
      const ih = img.height || 0
      if (iw > 0 && ih > 0) {
        const scale = this.baseStore.WATCH_SIZE / Math.max(iw, ih)
        img.set({ scaleX: scale, scaleY: scale })
      }
      img.setCoords()
      this.baseStore.canvas?.add(img as unknown as FabricObject)
      this.layerStore.addLayer(img as FabricElement & { eleType: string })
      this.baseStore.canvas?.requestRenderAll()
      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(img as unknown as FabricObject)
      this.startTimeUpdate()
      return img as unknown as FabricElement
    },

    async updateHandSVG(element: FabricElement, config: HandElementConfig) {
      if (!this.baseStore.canvas) return
      let hand = this.baseStore.canvas
        .getObjects()
        .find((obj: FabricObject) => (obj as FabricElement).id === element.id) as any
      if (!hand) return
      if (config.imageUrl && config.imageUrl !== hand.imageUrl) {
        const prevLeft = hand.left
        const prevTop = hand.top
        const prevAngle = hand.angle
        this.baseStore.canvas.remove(hand as unknown as FabricObject)
        const img: any = await FabricImage.fromURL(config.imageUrl, { crossOrigin: 'anonymous' } as any)
        hand = img
        hand.set({
          id: element.id,
          eleType: 'hourHand',
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
        const iw = hand.width || 0
        const ih = hand.height || 0
        if (iw > 0 && ih > 0) {
          const scale = this.baseStore.WATCH_SIZE / Math.max(iw, ih)
          hand.set({ scaleX: scale, scaleY: scale })
        }
        this.baseStore.canvas.add(hand as unknown as FabricObject)
      }
      if (typeof config.assetId === 'number') {
        ;(hand as any).assetId = config.assetId
      }
      const newAngle = this.getHourHandAngle()
      this.rotateHand(hand, newAngle)
      hand.setCoords()
      this.baseStore.canvas.requestRenderAll()
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(hand as unknown as FabricObject)
    },

    // removed height/rotation-center/color manual updates in minimal mode
    updateAngle(element: FabricElement, angle: number) {
      if (!this.baseStore.canvas) return
      const hourHand = this.baseStore.canvas
        .getObjects()
        .find((obj: FabricObject) => (obj as FabricElement).id === element.id) as FabricElement | undefined
      if (!hourHand) return
      this.rotateHand(hourHand, angle)
    },
    updateTime(time?: Date) {
      if (!this.baseStore.canvas) return
      const hourHand = this.baseStore.canvas
        .getObjects()
        .find((obj: FabricObject) => (obj as FabricElement).eleType === 'hourHand') as FabricElement | undefined
      if (!hourHand) return
      const angle = this.getHourHandAngle(time)
      this.rotateHand(hourHand, angle)
    },
    startTimeUpdate() {
      if (this.updateTimer) {
        clearInterval(this.updateTimer)
        this.updateTimer = null
      }
      this.updateTime()
      this.updateTimer = window.setInterval(() => {
        this.updateTime()
      }, 200)
    },
    stopTimeUpdate() {
      if (this.updateTimer) {
        clearInterval(this.updateTimer)
        this.updateTimer = null
      }
    },
    encodeConfig(element: FabricElement) {
      if (!element) throw new Error('Invalid element')
      return {
        id: String(element.id ?? ''),
        eleType: 'hourHand',
        left: element.left,
        top: element.top,
        originX: element.originX,
        originY: element.originY,
        angle: element.angle,
        imageUrl: element.imageUrl,
        assetId: (element as any).assetId,
      }
    },
    decodeConfig(config: HandElementConfig) {
      return {
        id: config.id,
        eleType: 'hourHand',
        left: config.left,
        top: config.top,
        angle: config.angle,
        imageUrl: config.imageUrl,
        assetId: config.assetId,
      }
    }
  }
})
