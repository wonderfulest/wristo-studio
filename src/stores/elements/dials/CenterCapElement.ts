import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Image as FabricImage } from 'fabric'
import { nanoid } from 'nanoid'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'

import type { DialElementConfig } from './RomansElement'

export const useCenterCapStore = defineStore('centerCapElement', {
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
    async addElement(options: DialElementConfig) {
      const id = options.id || nanoid()

      let imageUrl = options.imageUrl
      if (!imageUrl && (options as any).assetId) {
        try {
          const res = await analogAssetApi.get((options as any).assetId as number)
          imageUrl = res.data?.file?.url || res.data?.file?.previewUrl || null
        } catch (e) {
          console.error('Failed to fetch centerCap asset:', e)
          imageUrl = null
        }
      }

      if (!imageUrl) {
        const analogAssetStore = useAnalogAssetStore()
        // 暂时复用 center_cap 资源类型，如果后续有独立的 centerCap 资源类型再调整
        await analogAssetStore.loadAssets('center_cap' as any)
        const getFirstUrl = analogAssetStore.getFirstUrl as (type: any) => string | null
        const getFirstId = analogAssetStore.getFirstId as (type: any) => number | null

        imageUrl = getFirstUrl('center_cap')
        ;(options as any).assetId = getFirstId('center_cap')
      }

      if (!imageUrl) {
        console.error('No active assets available for default centerCap.')
        return
      }

      const img: any = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' } as any)
      let group: any = img

      const center = this.baseStore.WATCH_SIZE / 2

      group.set({
        id,
        eleType: 'centerCap',
        left: center,
        top: center,
        scaleX: 1,
        scaleY: 1,
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: true,
        hasBorders: true,
        imageUrl: imageUrl,
        assetId: (options as any).assetId,
      })

      const gw = group.width || 0
      const gh = group.height || 0
      const baseSize = Math.max(gw, gh) || 1
      const targetSize = (options as any).targetSize || (this.baseStore.WATCH_SIZE * 0.15)
      const scale = targetSize / baseSize

      group.set({ scaleX: scale, scaleY: scale })

      group.on('moving', () => {
        // 固定在中心：一旦移动就拉回中心
        const c = this.baseStore.WATCH_SIZE / 2
        group.set({ left: c, top: c })
      })
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
      const center = this.baseStore.WATCH_SIZE / 2
      element.set({ left: center, top: center })
      element.setCoords()
      this.baseStore.canvas?.requestRenderAll()
    },

    async updateSVG(element: any, config: DialElementConfig & { targetSize?: number }) {
      if (!this.baseStore.canvas) return
      let group: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.id === element.id)
      if (!group) return

      const center = this.baseStore.WATCH_SIZE / 2

      if (config.imageUrl && config.imageUrl !== group.imageUrl) {
        const prevScaleX = group.scaleX
        const prevScaleY = group.scaleY
        this.baseStore.canvas.remove(group)
        const img: any = await FabricImage.fromURL(config.imageUrl, { crossOrigin: 'anonymous' } as any)
        group = img
        group.set({
          id: element.id,
          eleType: 'centerCap',
          originX: 'center',
          originY: 'center',
          left: center,
          top: center,
          angle: element.angle,
          imageUrl: config.imageUrl,
          selectable: true,
          hasControls: true,
          hasBorders: true,
        })

        const gw = group.width || 0
        const gh = group.height || 0
        const baseSize = Math.max(gw, gh) || 1
        const currentSize = Math.max(baseSize * (prevScaleX || 1), baseSize * (prevScaleY || 1))
        const targetSize = config.targetSize || currentSize
        const scale = targetSize / baseSize
        group.set({ scaleX: scale, scaleY: scale })

        this.baseStore.canvas.add(group)
      }

      if (typeof (config as any).assetId === 'number') {
        group.assetId = (config as any).assetId
      }

      group.on('moving', () => {
        const c = this.baseStore.WATCH_SIZE / 2
        group.set({ left: c, top: c })
      })
      group.on('selected', () => {})
      group.on('deselected', () => {})

      group.setCoords()
      this.baseStore.canvas.requestRenderAll()
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(group)
    },

    encodeConfig(element: any) {
      if (!element) throw new Error('Invalid element')
      const renderedWidth = (element.width || 0) * (element.scaleX || 1)
      const renderedHeight = (element.height || 0) * (element.scaleY || 1)
      const targetSize = Math.max(renderedWidth, renderedHeight)

      return {
        id: element.id,
        eleType: 'centerCap',
        left: element.left,
        top: element.top,
        originX: element.originX,
        originY: element.originY,
        height: element.height,
        fill: element.fill,
        imageUrl: element.imageUrl,
        assetId: (element as any).assetId,
        targetSize,
      }
    },

    decodeConfig(config: any) {
      return {
        id: config.id,
        eleType: 'centerCap',
        left: config.left,
        top: config.top,
        height: config.height,
        fill: config.fill,
        imageUrl: config.imageUrl,
        assetId: config.assetId,
        targetSize: config.targetSize,
      }
    },
  },
})
