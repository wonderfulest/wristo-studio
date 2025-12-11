import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Image as FabricImage } from 'fabric'
import { nanoid } from 'nanoid'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'

import { HandElementConfig } from '@/types/elements'
import { FabricElement } from '@/types/element'

export const useSecondHandStore = defineStore('secondHandElement', {
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
      img.set({ angle })
      img.setCoords()
      this.baseStore.canvas?.requestRenderAll()
    },

    getSecondHandAngle(time?: Date) {
      const now = time || new Date()
      const seconds = now.getSeconds()
      const ms = now.getMilliseconds()
      // second hand: 6 deg per second
      const angle = (seconds + ms / 1000) * 6
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
          console.error('Failed to fetch second hand asset:', e)
        }
      }
      if (!imageUrl) {
        const analogAssetStore = useAnalogAssetStore()
        await analogAssetStore.loadAssets('second')
        imageUrl = analogAssetStore.getFirstUrl('second')
      }

      if (!imageUrl) {
        console.error('No active second hand assets available for default second hand.')
        return
      }
      const img: any = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' } as any)
      const options = {
        id,
        eleType: 'secondHand',
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: false,
        hasBorders: true,
        angle: this.getSecondHandAngle(),
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
      this.baseStore.canvas?.add(img)
      this.layerStore.addLayer(img)
      this.baseStore.canvas?.requestRenderAll()
      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(img)
      this.startTimeUpdate()
      return img as unknown as FabricElement
    },

    async updateHandSVG(element: any, config: HandElementConfig) {
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
          eleType: 'secondHand',
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
      if (typeof config.assetId === 'number') {
        hand.assetId = config.assetId
      }
      const newAngle = this.getSecondHandAngle()
      this.rotateHand(hand, newAngle)
      hand.setCoords()
      this.baseStore.canvas.requestRenderAll()
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(hand)
    },

    // removed height/rotation-center/color manual updates in minimal mode
    updateAngle(element: any, angle: number) {
      if (!this.baseStore.canvas) return
      const secondHand: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.id === element.id)
      if (!secondHand) return
      this.rotateHand(secondHand, angle)
    },
    updateTime(time?: Date) {
      if (!this.baseStore.canvas) return
      const secondHand: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.eleType === 'secondHand')
      if (!secondHand) return
      const angle = this.getSecondHandAngle(time)
      this.rotateHand(secondHand, angle)
    },
    startTimeUpdate() {
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
        eleType: 'secondHand',
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
        eleType: 'secondHand',
        left: config.left,
        top: config.top,
        angle: config.angle,
        imageUrl: config.imageUrl,
        assetId: config.assetId,
      }
    }
  }
})
