import { Image as FabricImage } from 'fabric'
import { nanoid } from 'nanoid'
import type { ElementType, FabricElement } from '@/types/element'
import type { HandElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useDesignStore } from '@/stores/designStore'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import { getSimulatedNow } from '@/engine/simulator/simulatedClock'

function getAssetType(eleType: ElementType): 'hour' | 'minute' | 'second' {
  if (eleType === 'minuteHand') return 'minute'
  if (eleType === 'secondHand') return 'second'
  return 'hour'
}

function getRenderableAssetUrl(asset: { file?: { previewUrl?: string | null; url?: string | null } } | null | undefined): string | null {
  return asset?.file?.url || asset?.file?.previewUrl || null
}

function getHourHandAngle(time?: Date): number {
  const now = time || getSimulatedNow()
  const hours = now.getHours() % 12
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()
  const ms = now.getMilliseconds()
  return (hours + minutes / 60 + seconds / 3600 + ms / 3_600_000) * 30
}

function getMinuteHandAngle(time?: Date): number {
  const now = time || getSimulatedNow()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()
  const ms = now.getMilliseconds()
  return (minutes + seconds / 60 + ms / 60000) * 6
}

function getSecondHandAngle(time?: Date): number {
  const now = time || getSimulatedNow()
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

function scaleHandImage(hand: any) {
  const iw = hand.width || 0
  const ih = hand.height || 0
  if (iw <= 0 || ih <= 0) return

  const designStore = useDesignStore()
  const scaleBase = designStore.watchSize || designStore.designSpec.width
  const scale = scaleBase / Math.max(iw, ih)
  hand.set({ scaleX: scale, scaleY: scale })
}

function removeExistingHandsByType(eleType: ElementType, exceptId?: string | number | null) {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const keepId = exceptId == null ? null : String(exceptId)
  const staleHands = (canvas.getObjects?.() || []).filter((obj: any) => {
    if (obj?.eleType !== eleType) return false
    if (keepId != null && obj?.id != null && String(obj.id) === keepId) return false
    return true
  })

  staleHands.forEach((obj: any) => {
    const id = obj?.id == null ? null : String(obj.id)
    canvas.remove(obj)
    if (id) {
      layerStore.removeLayer(id)
      elementDataStore.removeElement(id)
    }
  })

  if (staleHands.length) {
    canvasStore.setActiveIds(canvasStore.activeIds.filter((id) => {
      return !staleHands.some((obj: any) => obj?.id != null && String(obj.id) === String(id))
    }))
  }
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

    const angle = getAngleByType(targetType, getSimulatedNow())
    elements.forEach((el: any) => rotateHand(el, angle))
    canvas.requestRenderAll?.()
  }

  update()
  timers[eleType] = window.setInterval(update, 200)
}

async function resolveImageUrl(config: HandElementConfig): Promise<{ url: string | null; assetId: number | null }> {
  let imageUrl = config.imageUrl
  let assetId = config.assetId ?? null

  if (assetId) {
    try {
      const res = await analogAssetApi.get(assetId)
      imageUrl = getRenderableAssetUrl(res.data) || imageUrl
    } catch (e) {
      console.error('Failed to fetch hand asset by id:', e)
      imageUrl = imageUrl || null
    }
  }

  if (!imageUrl) {
    const assetType = getAssetType(config.eleType as ElementType)
    const analogAssetStore = useAnalogAssetStore()
    await analogAssetStore.loadAssets(assetType)
    const firstAsset = analogAssetStore.assetsByType[assetType]?.[0]
    imageUrl = getRenderableAssetUrl(firstAsset)
    assetId = firstAsset?.id ?? assetId
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

  scaleHandImage(img)

  img.setCoords()
  removeExistingHandsByType(eleType, id)
  canvas.add(img)
  layerStore.addLayer(img as any)
  useElementDataStore().upsertElement({
    ...config,
    id,
    eleType,
    left: img.left,
    top: img.top,
    originX: img.originX,
    originY: img.originY,
    angle: img.angle,
    imageUrl: url,
    assetId,
  } as HandElementConfig)
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
    const nextAssetId = patch.assetId ?? hand.assetId

    const img: any = await FabricImage.fromURL(patch.imageUrl, { crossOrigin: 'anonymous' } as any)
    canvas.remove(hand)
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
      assetId: nextAssetId,
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

    scaleHandImage(hand)

    canvas.add(hand)
    useLayerStore().addLayer(hand)
  }

  if (patch.assetId !== undefined) {
    hand.assetId = patch.assetId
  }

  const newAngle = getAngleByType(eleType)
  rotateHand(hand, newAngle)
  hand.setCoords()
  if (hand.id != null) {
    useElementDataStore().patchElement(String(hand.id), {
      left: hand.left,
      top: hand.top,
      originX: hand.originX,
      originY: hand.originY,
      angle: newAngle,
      imageUrl: hand.imageUrl,
      assetId: hand.assetId,
    } as Partial<HandElementConfig>)
  }
  canvas.requestRenderAll?.()
  canvas.discardActiveObject?.()
  canvas.setActiveObject?.(hand)

  ensureTimer(eleType)
}
