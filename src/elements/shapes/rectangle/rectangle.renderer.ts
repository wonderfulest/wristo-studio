import { Rect } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { RectangleElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'

function attachRectangleScaleSync(rectangle: Rect): void {
  rectangle.on('modified', () => {
    const idOnRect = (rectangle as any).id
    if (!idOnRect) return

    const rawWidth = Number((rectangle as any).width ?? 0)
    const rawHeight = Number((rectangle as any).height ?? 0)
    const sx = Number((rectangle as any).scaleX ?? 1)
    const sy = Number((rectangle as any).scaleY ?? 1)

    const nextWidth = rawWidth * (Number.isFinite(sx) ? sx : 1)
    const nextHeight = rawHeight * (Number.isFinite(sy) ? sy : 1)

    if (Number.isFinite(nextWidth) && Number.isFinite(nextHeight) && nextWidth > 0 && nextHeight > 0) {
      rectangle.set({
        width: nextWidth,
        height: nextHeight,
        scaleX: 1,
        scaleY: 1,
      } as any)
      rectangle.setCoords()
    }

    const store = useElementDataStore()
    store.patchElement(String(idOnRect), {
      left: rectangle.left as number,
      top: rectangle.top as number,
      width: rectangle.width as number,
      height: rectangle.height as number,
      fill: rectangle.fill as string,
      stroke: rectangle.stroke as string,
      strokeWidth: rectangle.strokeWidth as number,
      opacity: rectangle.opacity as number,
      borderRadius: (rectangle as any).rx as number,
    } as any)

    rectangle.canvas?.requestRenderAll?.()
  })
}

export async function createRectangle(config: RectangleElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()

  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add rectangle element')
  }

  const id = nanoid()

  const width = Number(config.width ?? 100)
  const height = Number(config.height ?? 100)
  const fill = config.fill || 'transparent'
  const stroke = config.stroke || '#FFFFFF'
  const strokeWidth = Number(config.strokeWidth ?? 0)
  const opacity = config.opacity != null ? Number(config.opacity) : 1
  const borderRadius = Number(config.borderRadius ?? 0)

  const rectOptions: any = {
    id,
    eleType: 'rectangle',
    left: Number(config.left) || 0,
    top: Number(config.top) || 0,
    width,
    height,
    fill,
    stroke,
    strokeWidth,
    opacity,
    rx: borderRadius,
    ry: borderRadius,
    originX: (config.originX as any) ?? 'center',
    originY: (config.originY as any) ?? 'center',
    selectable: true,
    hasControls: true,
    hasBorders: true,
    lockScalingX: false,
    lockScalingY: false,
    lockScalingFlip: true,
    initialConfig: {
      width,
      height,
      fill,
      stroke,
      strokeWidth,
      opacity,
      borderRadius,
    },
  }

  const rectangle = new Rect(rectOptions)

  attachRectangleScaleSync(rectangle)

  elementDataStore.upsertElement({
    id: String(id),
    eleType: 'rectangle',
    left: rectangle.left,
    top: rectangle.top,
    width: rectangle.width,
    height: rectangle.height,
    fill: rectangle.fill,
    stroke: rectangle.stroke,
    strokeWidth: rectangle.strokeWidth,
    opacity: rectangle.opacity,
    borderRadius: (rectangle as any).rx,
    originX: rectangle.originX,
    originY: rectangle.originY,
  } as any)

  canvas.add(rectangle as any)
  layerStore.addLayer(rectangle as any)
  canvas.renderAll()
  canvas.setActiveObject(rectangle as any)

  return rectangle as any
}

export function updateRectangle(
  element: FabricElement,
  patch: Partial<RectangleElementConfig> = {},
): void {
  const rect = element as any
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  const elementDataStore = useElementDataStore()

  if (!canvas || !rect) return

  if (patch.width !== undefined) {
    rect.set('width', Number(patch.width))
  }

  if (patch.height !== undefined) {
    rect.set('height', Number(patch.height))
  }

  if (patch.fill !== undefined) {
    rect.set('fill', patch.fill)
  }

  if (patch.stroke !== undefined) {
    rect.set('stroke', patch.stroke)
    rect.set('dirty', true)
  }

  if (patch.strokeWidth !== undefined) {
    rect.set('strokeWidth', Number(patch.strokeWidth))
    rect.set('dirty', true)
  }

  if (patch.opacity !== undefined) {
    rect.set('opacity', Number(patch.opacity))
  }

  if (patch.borderRadius !== undefined) {
    rect.set({
      rx: Number(patch.borderRadius),
      ry: Number(patch.borderRadius),
    })
  }

  if (patch.left !== undefined) {
    rect.set('left', Number(patch.left))
  }

  if (patch.top !== undefined) {
    rect.set('top', Number(patch.top))
  }

  rect.initialConfig = {
    width: rect.width,
    height: rect.height,
    fill: rect.fill,
    stroke: rect.stroke,
    strokeWidth: rect.strokeWidth,
    opacity: rect.opacity,
    borderRadius: rect.rx,
  }

  rect.setCoords()
  rect.dirty = true
  canvas.renderAll?.()

  const id = rect.id
  if (id != null) {
    elementDataStore.patchElement(String(id), {
      left: rect.left as number,
      top: rect.top as number,
      width: rect.width as number,
      height: rect.height as number,
      fill: rect.fill as string,
      stroke: rect.stroke as string,
      strokeWidth: rect.strokeWidth as number,
      opacity: rect.opacity as number,
      borderRadius: (rect as any).rx as number,
    } as any)
  }
}
