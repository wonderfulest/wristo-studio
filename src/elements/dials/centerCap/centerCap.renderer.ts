import { Image as FabricImage } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useDesignStore } from '@/stores/designStore'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { CenterCapElementConfig } from '@/elements/dials/centerCap/centerCap.encoder'
import { applyControlsToObject } from '@/utils/controlManager'

function getCanvasCenter() {
  const canvasStore = useCanvasStore()
  const designStore = useDesignStore()
  const canvas = canvasStore.canvas
  const canvasCenterX = Number(canvas?.getWidth?.() || 0) / 2
  const canvasCenterY = Number(canvas?.getHeight?.() || 0) / 2
  return {
    x: Number(designStore.designSpec.centerX ?? canvasCenterX),
    y: Number(designStore.designSpec.centerY ?? canvasCenterY),
  }
}

function syncCenterCapSize(element: any) {
  const renderedWidth = Number(element.width || 0) * Number(element.scaleX || 1)
  const renderedHeight = Number(element.height || 0) * Number(element.scaleY || 1)
  const targetSize = Math.max(renderedWidth, renderedHeight)
  if (Number.isFinite(targetSize) && targetSize > 0) {
    element.targetSize = targetSize
  }
}

function lockCenterCapToCanvasCenter(element: any) {
  const center = getCanvasCenter()
  element.set({ left: center.x, top: center.y })
  element.setCoords?.()
}

function configureCenterCapControls(element: any) {
  element.set({
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
    designerControlMode: 'corner4',
    lockMovementX: true,
    lockMovementY: true,
    lockRotation: true,
    lockScalingFlip: true,
  })
  applyControlsToObject(element)
  element.on('scaling', () => {
    lockCenterCapToCanvasCenter(element)
    syncCenterCapSize(element)
  })
  element.on('modified', () => {
    lockCenterCapToCanvasCenter(element)
    syncCenterCapSize(element)
  })
}

export async function createCenterCap(
  config: CenterCapElementConfig,
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
      imageUrl = (res.data?.file?.url || res.data?.file?.previewUrl || null) as string | null
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
    config.assetId = getFirstId('center_cap')
  }

  if (!imageUrl) {
    console.error('No active assets available for default centerCap.')
    return
  }

  const img: any = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' } as any)
  const element: any = img

  const center = getCanvasCenter()
  const gw = element.width || 0
  const gh = element.height || 0
  const baseSize = Math.max(gw, gh) || 1
  const targetSize = config.targetSize || Math.min(canvas.getWidth?.() || baseSize, canvas.getHeight?.() || baseSize) * 0.15 || baseSize

  element.set({
    id,
    eleType: 'centerCap',
    left: center.x,
    top: center.y,
    scaleX: 1,
    scaleY: 1,
    originX: 'center',
    originY: 'center',
    imageUrl,
    assetId: config.assetId,
    targetSize,
  })

  const scale = targetSize / baseSize

  element.set({ scaleX: scale, scaleY: scale })
  configureCenterCapControls(element)

  element.on('moving', () => {
    lockCenterCapToCanvasCenter(element)
  })
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

export async function updateCenterCap(
  element: FabricElement,
  patch: Partial<CenterCapElementConfig>,
): Promise<void> {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas || !element) return

  const objects: any[] = canvas.getObjects() as any[]
  let group: any = objects.find((obj: any) => obj.id === (element as any).id)
  if (!group) return

  const center = getCanvasCenter()

  const nextImageUrl = patch.imageUrl
  const hasNewImage = typeof nextImageUrl === 'string' && nextImageUrl.length > 0

  if (hasNewImage && nextImageUrl !== group.imageUrl) {
    const prevAngle = group.angle
    const prevRenderedWidth = (group.width || 0) * (group.scaleX || 1)
    const prevRenderedHeight = (group.height || 0) * (group.scaleY || 1)
    const prevTargetSize = Math.max(prevRenderedWidth, prevRenderedHeight)

    canvas.remove(group)

    const img: any = await FabricImage.fromURL(nextImageUrl as string, {
      crossOrigin: 'anonymous',
    } as any)
    group = img
    group.set({
      id: (element as any).id,
      eleType: 'centerCap',
      originX: 'center',
      originY: 'center',
      left: center.x,
      top: center.y,
      angle: prevAngle,
      imageUrl: nextImageUrl,
    })

    const gw = group.width || 0
    const gh = group.height || 0
    const baseSize = Math.max(gw, gh) || 1
    const targetSize = patch.targetSize || prevTargetSize || baseSize
    const scale = targetSize / baseSize
    group.set({ scaleX: scale, scaleY: scale, targetSize })
    configureCenterCapControls(group)

    canvas.add(group)
  }

  if (typeof patch.assetId === 'number') {
    group.assetId = patch.assetId
  }

  if (patch.targetSize && !hasNewImage) {
    const baseSize = Math.max(group.width || 1, group.height || 1)
    const scale = patch.targetSize / baseSize
    group.set({ scaleX: scale, scaleY: scale })
  }

  if (patch.targetSize) {
    group.targetSize = patch.targetSize
  }

  group.on('moving', () => {
    lockCenterCapToCanvasCenter(group)
  })
  group.on('selected', () => {})
  group.on('deselected', () => {})

  group.set({ left: center.x, top: center.y })
  group.setCoords()
  canvas.requestRenderAll?.()
  canvas.discardActiveObject?.()
  canvas.setActiveObject?.(group)
}
