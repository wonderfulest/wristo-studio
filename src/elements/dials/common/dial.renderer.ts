import { Image as FabricImage } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import { useDesignStore } from '@/stores/designStore'
import type { DialElementConfig, DialType } from './dial.schema'

function getBaseSize(type: DialType): number {
  const canvasStore = useCanvasStore()
  const designStore = useDesignStore()
  const canvas = canvasStore.canvas

  if (type === 'romans') {
    return canvas?.getWidth?.() ?? 0
  }

  if (type === 'tick12') {
    return designStore.designSpec.width
  }

  // tick60 默认用 watchSize
  return (designStore as any).watchSize ?? designStore.designSpec.width
}

export async function createDial(
  config: DialElementConfig,
  type: DialType,
): Promise<FabricElement | undefined> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()

  const canvas = canvasStore.canvas
  if (!canvas) return

  const id = config.id || nanoid()

  let imageUrl = config.imageUrl
  if (!imageUrl && config.assetId) {
    try {
      const res = await analogAssetApi.get(config.assetId)
      imageUrl = res.data?.file?.url || res.data?.file?.previewUrl || null
    } catch (e) {
      console.error(`Failed to fetch ${type} asset:`, e)
      imageUrl = null
    }
  }

  if (!imageUrl) {
    const analogAssetStore = useAnalogAssetStore()
    await analogAssetStore.loadAssets(type)
    imageUrl = analogAssetStore.getFirstUrl(type as any)
    config.assetId = analogAssetStore.getFirstId(type as any)
  }

  if (!imageUrl) {
    console.error(`No active ${type} assets available for default ${type}.`)
    return
  }

  const img: any = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' } as any)
  const element: any = img

  element.set({
    id,
    eleType: type,
    left: config.left,
    top: config.top,
    scaleX: 1,
    scaleY: 1,
    originX: 'center',
    originY: 'center',
    selectable: true,
    hasControls: false,
    hasBorders: true,
    imageUrl: imageUrl,
    assetId: config.assetId,
  })

  const gw = element.width || 0
  const gh = element.height || 0
  const baseSize = getBaseSize(type)

  if (gw > 0 && gh > 0 && baseSize > 0) {
    const scale = baseSize / Math.max(gw, gh)
    element.set({ scaleX: scale, scaleY: scale })
  } else if (baseSize > 0) {
    element.scaleToWidth(baseSize)
  }

  element.on('moving', () => {})
  element.on('selected', () => {})
  element.on('deselected', () => {})

  element.setCoords()
  canvas.add(element)
  layerStore.addLayer(element)
  canvas.requestRenderAll?.()
  canvas.discardActiveObject?.()
  canvas.setActiveObject?.(element)

  return element as FabricElement
}

export async function updateDial(
  element: FabricElement,
  patch: Partial<DialElementConfig>,
  type: DialType,
): Promise<void> {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas || !element) return

  const objects: any[] = canvas.getObjects() as any[]
  let group: any = objects.find((obj: any) => obj.id === (element as any).id)
  if (!group) return

  const nextImageUrl = patch.imageUrl
  const hasNewImage = typeof nextImageUrl === 'string' && nextImageUrl.length > 0

  if (hasNewImage && nextImageUrl !== group.imageUrl) {
    const prevLeft = group.left
    const prevTop = group.top
    const prevAngle = group.angle

    canvas.remove(group)

    const img: any = await FabricImage.fromURL(nextImageUrl as string, {
      crossOrigin: 'anonymous',
    } as any)
    group = img
    group.set({
      id: (element as any).id,
      eleType: type,
      originX: 'center',
      originY: 'center',
      left: prevLeft,
      top: prevTop,
      angle: prevAngle,
      imageUrl: nextImageUrl,
      selectable: true,
      hasControls: false,
      hasBorders: true,
    })

    const gw = group.width || 0
    const gh = group.height || 0
    const baseSize = getBaseSize(type)
    if (gw > 0 && gh > 0 && baseSize > 0) {
      const scale = baseSize / Math.max(gw, gh)
      group.set({ scaleX: scale, scaleY: scale })
    } else if (baseSize > 0) {
      group.scaleToWidth(baseSize)
    }

    canvas.add(group)
  }

  if (typeof patch.assetId === 'number') {
    group.assetId = patch.assetId
  }

  if (patch.left !== undefined || patch.top !== undefined) {
    group.set({
      left: patch.left !== undefined ? patch.left : group.left,
      top: patch.top !== undefined ? patch.top : group.top,
    })
  }

  group.on('moving', () => {})
  group.on('selected', () => {})
  group.on('deselected', () => {})

  group.setCoords()
  canvas.requestRenderAll?.()
  canvas.discardActiveObject?.()
  canvas.setActiveObject?.(group)
}
