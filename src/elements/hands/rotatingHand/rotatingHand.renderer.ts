import { Image as FabricImage } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { RotatingHandElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useDesignStore } from '@/stores/designStore'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { ElementRenderContext } from '@/engine/runtime/elementRenderContext'
import { assertElementRenderCurrent } from '@/engine/runtime/elementRenderContext'
import type { ElementUpdateContext } from '@/engine/registry/elementRegistry'
import { getHandGeometry, getRotatedHandCenter } from '@/elements/hands/common/hand.geometry'
import { handCalibrationState } from '@/elements/hands/common/handCalibration'
import { resolveRotatingHandAngle, resolveRotatingHandDirectionAngle, toRotatingHandRenderAngle } from './rotatingHand.math'

function getRenderableAssetUrl(asset: { file?: { previewUrl?: string | null; url?: string | null } } | null | undefined): string | null {
  return asset?.file?.url || asset?.file?.previewUrl || null
}

async function resolveImageUrl(config: RotatingHandElementConfig): Promise<{ url: string | null; assetId: number | null }> {
  let imageUrl = config.imageUrl
  let assetId = config.assetId ?? null

  if (assetId) {
    try {
      const response = await analogAssetApi.get(assetId)
      imageUrl = getRenderableAssetUrl(response.data) || imageUrl
    } catch (error) {
      console.error('Failed to fetch rotating hand asset by id:', error)
    }
  }

  if (!imageUrl) {
    const store = useAnalogAssetStore()
    await store.loadAssets('hour')
    const firstAsset = store.assetsByType.hour?.[0]
    imageUrl = getRenderableAssetUrl(firstAsset)
    assetId = firstAsset?.id ?? assetId
  }

  return { url: imageUrl, assetId }
}

function applyGeometry(hand: any, input: Partial<RotatingHandElementConfig> = {}): void {
  const imageWidth = Number(hand.width ?? 0)
  const imageHeight = Number(hand.height ?? 0)
  if (imageWidth <= 0 || imageHeight <= 0) return

  const designStore = useDesignStore()
  const scaleBase = designStore.watchSize || designStore.designSpec.width
  const centerX = Number(input.centerX ?? hand.centerX ?? input.left ?? hand.left ?? designStore.designSpec.centerX)
  const centerY = Number(input.centerY ?? hand.centerY ?? input.top ?? hand.top ?? designStore.designSpec.centerY)
  const geometry = getHandGeometry({
    left: centerX,
    top: centerY,
    centerX,
    centerY,
    pivotOffsetX: input.pivotOffsetX ?? hand.pivotOffsetX ?? 0,
    pivotOffsetY: input.pivotOffsetY ?? hand.pivotOffsetY ?? 0,
    scalePercent: input.scalePercent ?? hand.scalePercent ?? 100,
  }, scaleBase, imageWidth, imageHeight)

  hand.set({
    ...geometry,
    scaleX: geometry.imageScale,
    scaleY: geometry.imageScale,
    rotationCenter: { x: geometry.pivotX, y: geometry.pivotY },
  })
}

function previewAngle(hand: any): number | null {
  if (handCalibrationState.active && String(hand.id) === handCalibrationState.selectedHandId) {
    return 0
  }
  const configuredAngle = hand.progressMode === 'direction'
    ? resolveRotatingHandDirectionAngle(Number(hand.previewBearing), hand)
    : resolveRotatingHandAngle(Number(hand.previewProgress) / 100, hand)
  return configuredAngle == null ? null : toRotatingHandRenderAngle(configuredAngle)
}

function applyPreviewRotation(hand: any): void {
  const angle = previewAngle(hand)
  if (angle == null) {
    hand.set({ visible: false })
    return
  }
  const position = getRotatedHandCenter(hand, angle)
  hand.set({ angle, visible: true, ...position })
}

function snapshot(hand: any): Partial<RotatingHandElementConfig> & { angle: number } {
  return {
    dialProperty: String(hand.dialProperty ?? ''),
    progressMode: hand.progressMode === 'goal' || hand.progressMode === 'direction' ? hand.progressMode : 'range',
    previewProgress: Number(hand.previewProgress ?? 50),
    previewBearing: Number(hand.previewBearing ?? 0),
    northAngle: Number(hand.northAngle ?? 270),
    startAngle: Number(hand.startAngle ?? 150),
    endAngle: Number(hand.endAngle ?? 390),
    counterClockwise: Boolean(hand.counterClockwise),
    outOfRangeBehavior: hand.outOfRangeBehavior === 'hide' ? 'hide' : 'clamp',
    imageUrl: hand.imageUrl ?? null,
    assetId: hand.assetId ?? null,
    left: Number(hand.centerX ?? hand.left ?? 0),
    top: Number(hand.centerY ?? hand.top ?? 0),
    originX: hand.originX ?? 'center',
    originY: hand.originY ?? 'center',
    centerX: Number(hand.centerX ?? hand.left ?? 0),
    centerY: Number(hand.centerY ?? hand.top ?? 0),
    pivotOffsetX: Number(hand.pivotOffsetX ?? 0),
    pivotOffsetY: Number(hand.pivotOffsetY ?? 0),
    scalePercent: Number(hand.scalePercent ?? 100),
    angle: Number(hand.angle ?? hand.startAngle ?? 0),
  }
}

export async function createRotatingHand(
  input: RotatingHandElementConfig,
  renderContext?: ElementRenderContext,
): Promise<FabricElement> {
  assertElementRenderCurrent(renderContext)
  const canvas = useCanvasStore().canvas
  if (!canvas) throw new Error('Canvas not initialized, cannot add rotating hand element')

  const id = input.id || nanoid()
  const { url, assetId } = await resolveImageUrl(input)
  assertElementRenderCurrent(renderContext)
  if (!url) throw new Error('No active hand assets available')

  const hand: any = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' } as any)
  assertElementRenderCurrent(renderContext)
  hand.set({
    ...input,
    id,
    eleType: 'rotatingHand',
    originX: 'center',
    originY: 'center',
    imageUrl: url,
    assetId,
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
  applyGeometry(hand, input)
  applyPreviewRotation(hand)
  hand.setCoords()

  canvas.add(hand)
  useLayerStore().addLayer(hand)
  useElementDataStore().upsertElement({
    ...input,
    ...snapshot(hand),
    id,
    eleType: 'rotatingHand',
  } as RotatingHandElementConfig)
  canvas.requestRenderAll?.()
  canvas.discardActiveObject?.()
  canvas.setActiveObject?.(hand)
  return hand as FabricElement
}

export async function updateRotatingHand(
  element: FabricElement,
  patch: Partial<RotatingHandElementConfig> = {},
  context: ElementUpdateContext = {},
): Promise<void> {
  const canvas = useCanvasStore().canvas
  if (!canvas || !element) return
  let hand = element as any

  if (patch.imageUrl && patch.imageUrl !== hand.imageUrl) {
    const previous = snapshot(hand)
    const replacement: any = await FabricImage.fromURL(patch.imageUrl, { crossOrigin: 'anonymous' } as any)
    replacement.set({
      ...previous,
      id: hand.id,
      eleType: 'rotatingHand',
      originX: 'center',
      originY: 'center',
      imageUrl: patch.imageUrl,
      assetId: patch.assetId ?? hand.assetId ?? null,
      layerName: hand.layerName,
      displayStates: hand.displayStates,
      visibility: hand.visibility,
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
    canvas.remove(hand)
    hand = replacement
    canvas.add(hand)
    useLayerStore().addLayer(hand)
  }

  hand.set(patch)
  applyGeometry(hand, patch)
  applyPreviewRotation(hand)
  hand.setCoords()

  if (context.persist !== false && hand.id != null) {
    useElementDataStore().patchElement(String(hand.id), snapshot(hand))
  }
  canvas.requestRenderAll?.()
  canvas.discardActiveObject?.()
  canvas.setActiveObject?.(hand)
}
