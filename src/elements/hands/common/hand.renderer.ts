import { Image as FabricImage } from 'fabric'
import { nanoid } from 'nanoid'
import type { ElementType, FabricElement } from '@/types/element'
import type { HandElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useDesignStore } from '@/stores/designStore'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'

function getAssetType(eleType: ElementType): 'hour' | 'minute' | 'second' {
  if (eleType === 'minuteHand') return 'minute'
  if (eleType === 'secondHand') return 'second'
  return 'hour'
}

function getHourHandAngle(time?: Date): number {
  const now = time || new Date()
  const hours = now.getHours() % 12
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()
  const ms = now.getMilliseconds()
  return (hours + minutes / 60 + seconds / 3600 + ms / 3_600_000) * 30
}

function getMinuteHandAngle(time?: Date): number {
  const now = time || new Date()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()
  const ms = now.getMilliseconds()
  return (minutes + seconds / 60 + ms / 60000) * 6
}

function getSecondHandAngle(time?: Date): number {
  const now = time || new Date()
  const seconds = now.getSeconds()
  const ms = now.getMilliseconds()
  return (seconds + ms / 1000) * 6
}

function getAngleByType(eleType: ElementType, time?: Date): number {
  if (eleType === 'minuteHand') return getMinuteHandAngle(time)
  if (eleType === 'secondHand') return getSecondHandAngle(time)
  return getHourHandAngle(time)
}

function rotateHand(element: any, angle: number) {
  element.set({ angle })
  element.setCoords()
}

const timers: Partial<Record<ElementType, number | null>> = {
  hourHand: null,
  minuteHand: null,
  secondHand: null,
}

function ensureTimer(eleType: ElementType) {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  if (timers[eleType]) return

  const update = () => {
    const objects = canvas.getObjects?.() || []
    const targetType = eleType
    const elements = objects.filter((obj: any) => obj.eleType === targetType)
    if (!elements.length) return

    const angle = getAngleByType(targetType, new Date())
    elements.forEach((el: any) => rotateHand(el, angle))
    canvas.requestRenderAll?.()
  }

  update()
  timers[eleType] = window.setInterval(update, 200)
}

async function resolveImageUrl(config: HandElementConfig): Promise<{ url: string | null; assetId: number | null }> {
  let imageUrl = config.imageUrl
  let assetId = config.assetId ?? null

  if (!imageUrl && assetId) {
    try {
      const res = await analogAssetApi.get(assetId)
      imageUrl = res.data?.file?.url || res.data?.file?.previewUrl || null
    } catch (e) {
      console.error('Failed to fetch hand asset by id:', e)
      imageUrl = null
    }
  }

  if (!imageUrl) {
    const assetType = getAssetType(config.eleType as ElementType)
    const analogAssetStore = useAnalogAssetStore()
    await analogAssetStore.loadAssets(assetType)
    imageUrl = analogAssetStore.getFirstUrl(assetType)
    assetId = analogAssetStore.getFirstId(assetType) ?? assetId
  }

  return { url: imageUrl, assetId }
}

export async function createHand(config: HandElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const designStore = useDesignStore()

  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas not initialized, cannot add hand element')
  }

  const eleType = (config.eleType as ElementType) || 'hourHand'
  const id = config.id || nanoid()

  const { url, assetId } = await resolveImageUrl({ ...config, eleType })

  if (!url) {
    console.error('No active hand assets available for default hand:', eleType)
    throw new Error('No active hand assets available')
  }

  const img: any = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' } as any)

  const commonOptions: any = {
    id,
    eleType,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    angle: getAngleByType(eleType),
    left:
      config.left ??
      (eleType === 'hourHand'
        ? designStore.watchSize / 2
        : designStore.designSpec.centerX),
    top:
      config.top ??
      (eleType === 'hourHand'
        ? designStore.watchSize / 2
        : designStore.designSpec.centerY),
    imageUrl: url,
    assetId,
  }

  img.set(commonOptions)

  const iw = img.width || 0
  const ih = img.height || 0
  if (iw > 0 && ih > 0) {
    let scaleBase: number
    if (eleType === 'hourHand') {
      scaleBase = designStore.watchSize
    } else if (eleType === 'minuteHand') {
      scaleBase = designStore.designSpec.centerX
    } else {
      scaleBase = designStore.designSpec.width
    }
    const scale = scaleBase / Math.max(iw, ih)
    img.set({ scaleX: scale, scaleY: scale })
  }

  img.setCoords()
  canvas.add(img)
  layerStore.addLayer(img as any)
  canvas.requestRenderAll()
  canvas.discardActiveObject?.()
  canvas.setActiveObject?.(img)

  ensureTimer(eleType)

  return img as FabricElement
}

export async function updateHand(
  element: FabricElement,
  patch: Partial<HandElementConfig> = {},
): Promise<void> {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas || !element) return

  let hand = element as any
  const eleType = (hand.eleType as ElementType) || 'hourHand'

  if (patch.imageUrl && patch.imageUrl !== hand.imageUrl) {
    const prevLeft = hand.left
    const prevTop = hand.top
    const prevAngle = hand.angle

    canvas.remove(hand)

    const img: any = await FabricImage.fromURL(patch.imageUrl, { crossOrigin: 'anonymous' } as any)
    hand = img
    hand.set({
      id: element.id,
      eleType,
      originX: 'center',
      originY: 'center',
      left: prevLeft,
      top: prevTop,
      angle: prevAngle,
      imageUrl: patch.imageUrl,
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
    })

    const iw = hand.width || 0
    const ih = hand.height || 0
    if (iw > 0 && ih > 0) {
      const designStore = useDesignStore()
      let scaleBase: number
      if (eleType === 'hourHand') {
        scaleBase = designStore.watchSize
      } else if (eleType === 'minuteHand') {
        scaleBase = designStore.designSpec.centerX
      } else {
        scaleBase = designStore.designSpec.width
      }
      const scale = scaleBase / Math.max(iw, ih)
      hand.set({ scaleX: scale, scaleY: scale })
    }

    canvas.add(hand)
  }

  if (typeof patch.assetId === 'number') {
    hand.assetId = patch.assetId
  }

  const newAngle = getAngleByType(eleType)
  rotateHand(hand, newAngle)
  hand.setCoords()
  canvas.requestRenderAll?.()
  canvas.discardActiveObject?.()
  canvas.setActiveObject?.(hand)

  ensureTimer(eleType)
}
