import { Image as FabricImage } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import { useDesignStore } from '@/stores/designStore'
import type { DialElementConfig, DialType } from './dial.schema'
import { applyControlsToObject } from '@/utils/controlManager'
import { applyDialColorPreview, supportsDialDynamicColor } from './dialColor'

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

function normalizeScaleFactor(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 1
  return numeric
}

function getDialRenderedSize(element: any): number {
  const renderedWidth = Number(element.width || 0) * Number(element.scaleX || 1)
  const renderedHeight = Number(element.height || 0) * Number(element.scaleY || 1)
  return Math.max(renderedWidth, renderedHeight)
}

function syncDialScaleFactor(element: any) {
  const baseSize = Number(element.dialBaseSize || 0)
  const renderedSize = getDialRenderedSize(element)
  if (baseSize > 0 && Number.isFinite(renderedSize) && renderedSize > 0) {
    element.scaleFactor = Number((renderedSize / baseSize).toFixed(4))
  }
}

function lockDialToCanvasCenter(element: any) {
  const center = getCanvasCenter()
  element.set({ left: center.x, top: center.y })
  element.setCoords?.()
}

function applyDialScale(element: any, type: DialType, scaleFactor: unknown) {
  const gw = Number(element.width || 0)
  const gh = Number(element.height || 0)
  const baseSize = getBaseSize(type)
  const normalizedScaleFactor = normalizeScaleFactor(scaleFactor)
  element.dialBaseSize = baseSize
  element.scaleFactor = normalizedScaleFactor

  if (gw > 0 && gh > 0 && baseSize > 0) {
    const scale = (baseSize * normalizedScaleFactor) / Math.max(gw, gh)
    element.set({ scaleX: scale, scaleY: scale })
  } else if (baseSize > 0) {
    element.scaleToWidth(baseSize * normalizedScaleFactor)
  }
  syncDialScaleFactor(element)
}

function configureDialControls(element: any) {
  element.set({
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
    designerControlMode: 'corner4Inset',
    lockMovementX: true,
    lockMovementY: true,
    lockRotation: true,
    lockScalingFlip: true,
  })
  applyControlsToObject(element)
  if (!element.__dialControlHandlersBound) {
    const syncDialTransform = () => {
      lockDialToCanvasCenter(element)
      syncDialScaleFactor(element)
    }
    element.on('scaling', syncDialTransform)
    element.on('modified', syncDialTransform)
    element.on('moving', syncDialTransform)
    element.__dialControlHandlersBound = true
  }
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
  const center = getCanvasCenter()

  element.set({
    id,
    eleType: type,
    left: center.x,
    top: center.y,
    scaleX: 1,
    scaleY: 1,
    originX: 'center',
    originY: 'center',
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
    designerControlMode: 'corner4Inset',
    imageUrl: imageUrl,
    assetId: config.assetId,
    fill: config.fill || '#ffffff',
    fillProperty: config.fillProperty || '',
    scaleFactor: normalizeScaleFactor(config.scaleFactor),
  })

  applyDialScale(element, type, config.scaleFactor)
  if (supportsDialDynamicColor(type)) {
    applyDialColorPreview(element, element.fill, element.fillProperty)
  }
  configureDialControls(element)

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
    const prevAngle = group.angle
    syncDialScaleFactor(group)
    const prevScaleFactor = normalizeScaleFactor(group.scaleFactor)
    const prevFill = group.fill || '#ffffff'
    const prevFillProperty = group.fillProperty || ''
    const center = getCanvasCenter()

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
      left: center.x,
      top: center.y,
      angle: prevAngle,
      imageUrl: nextImageUrl,
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      designerControlMode: 'corner4Inset',
      fill: patch.fill ?? prevFill,
      fillProperty: patch.fillProperty ?? prevFillProperty,
      scaleFactor: prevScaleFactor,
    })

    applyDialScale(group, type, patch.scaleFactor ?? prevScaleFactor)
    configureDialControls(group)

    canvas.add(group)
  }

  if (typeof patch.assetId === 'number') {
    group.assetId = patch.assetId
  }

  if (patch.fill !== undefined) {
    group.fill = patch.fill
  }
  if (patch.fillProperty !== undefined) {
    group.fillProperty = patch.fillProperty
  }

  if (patch.scaleFactor !== undefined && !hasNewImage) {
    applyDialScale(group, type, patch.scaleFactor)
  }

  if (supportsDialDynamicColor(type)) {
    applyDialColorPreview(group, group.fill || '#ffffff', group.fillProperty || '')
  }

  configureDialControls(group)
  group.on('selected', () => {})
  group.on('deselected', () => {})

  lockDialToCanvasCenter(group)
  syncDialScaleFactor(group)
  group.setCoords()
  canvas.requestRenderAll?.()
  canvas.discardActiveObject?.()
  canvas.setActiveObject?.(group)
}
