import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Image as FabricImage } from 'fabric'
import { nanoid } from 'nanoid'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import { HandElementConfig } from '@/types/elements'
import { FabricElement } from '@/types/element'

export const useMinuteHandStore = defineStore('minuteHandElement', {
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
      updateTimer: null as any
    }
  },

  actions: {
    rotateHand(img: any, angle: number) {
      // Log each rotate for debugging could be noisy; primary logs are in updateTime
      img.set({ angle })
      img.setCoords()
      this.baseStore.canvas?.requestRenderAll()
    },

    getMinuteHandAngle(time?: Date) {
      const now = time || new Date()
      const minutes = now.getMinutes()
      const seconds = now.getSeconds()
      const ms = now.getMilliseconds()
      // minute hand: 6 degrees per minute, 0.1 deg per second
      const angle = (minutes + seconds / 60 + ms / 60000) * 6
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
          console.error('Failed to fetch minute hand asset:', e)
        }
      }
      if (!imageUrl) {
        const analogAssetStore = useAnalogAssetStore()
        await analogAssetStore.loadAssets('minute')
        imageUrl = analogAssetStore.getFirstUrl('minute')
      }

      if (!imageUrl) {
        console.error('No active minute hand assets available for default minute hand.')
        return
      }
      const img: any = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' } as any)
      const options = {
        id,
        eleType: 'minuteHand',
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: false,
        hasBorders: true,
        angle: this.getMinuteHandAngle(),
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
      // Timer now runs continuously; remove selected/deselected timer control
      img.setCoords()
      this.baseStore.canvas?.add(img)
      this.layerStore.addLayer(img)
      this.baseStore.canvas?.requestRenderAll()
      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(img)
      // start/update smooth time updates (single interval)
      this.startTimeUpdate()
      return img as unknown as FabricElement
    },

    async updateHandSVG(element: any, config: HandElementConfig) {
      console.log('update minute Hand SVG', element, config);
      if (!this.baseStore.canvas) return
      let hand: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.id === element.id)
      if (!hand) return
      if (config.imageUrl && config.imageUrl !== hand.imageUrl) {
        const prevLeft = hand.left
        const prevTop = hand.top
        const prevAngle = hand.angle
        this.baseStore.canvas.remove(hand)
        const img: any = await FabricImage.fromURL(config.imageUrl, { crossOrigin: 'anonymous' } as any)
        hand = img
        hand.set({
          id: element.id,
          eleType: 'minuteHand',
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
        this.baseStore.canvas.add(hand)
      }
      // Update assetId if provided
      if (typeof config.assetId === 'number') {
        hand.assetId = config.assetId
      }
      const newAngle = this.getMinuteHandAngle()
      this.rotateHand(hand, newAngle)
      hand.setCoords()
      this.baseStore.canvas.requestRenderAll()
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(hand)
    },

    // removed height/rotation-center/color manual updates in minimal mode
    updateAngle(element: any, angle: number) {
      if (!this.baseStore.canvas) return
      const minuteHand: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.id === element.id)
      if (!minuteHand) return
      this.rotateHand(minuteHand, angle)
    },
    updateTime(time?: Date) {
      if (!this.baseStore.canvas) return
      const minuteHand: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.eleType === 'minuteHand')
      if (!minuteHand) return
      const angle = this.getMinuteHandAngle(time)
      this.rotateHand(minuteHand, angle)
    },
    startTimeUpdate() {
      // ensure single interval
      if (this.updateTimer) {
        clearInterval(this.updateTimer)
        this.updateTimer = null
      }
      this.updateTime()
      this.updateTimer = setInterval(() => {
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
        eleType: 'minuteHand',
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
        eleType: 'minuteHand',
        left: config.left,
        top: config.top,
        angle: config.angle,
        imageUrl: config.imageUrl,
        assetId: config.assetId,
      }
    }
  }
})
