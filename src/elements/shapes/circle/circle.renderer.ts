import { Circle } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { CircleElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { createRectangleGradientFill, normalizeRectangleGradientDirection } from '../rectangle/rectangle.gradient'

export const MIN_CIRCLE_RADIUS = 3

export function normalizeCircleRadius(value: unknown): number {
  const radius = Number(value ?? 50)
  if (!Number.isFinite(radius)) return MIN_CIRCLE_RADIUS
  return Math.max(MIN_CIRCLE_RADIUS, Math.round(radius))
}

function applyCircleFill(circle: Circle): void {
  const target = circle as any
  const solidFill = target.solidFill ?? 'transparent'
  const diameter = Number(circle.radius ?? 0) * 2
  const gradient = createRectangleGradientFill({
    enabled: Boolean(target.gradientEnabled),
    startColor: target.gradientStartColor ?? solidFill,
    endColor: target.gradientEndColor ?? solidFill,
    direction: normalizeRectangleGradientDirection(target.gradientDirection),
    width: diameter,
    height: diameter,
  })
  circle.set('fill', gradient ?? solidFill)
}

function attachCircleScaleSync(circle: Circle): void {
  const c = circle as Circle & { __circleScaleSyncAttached?: boolean }
  if (c.__circleScaleSyncAttached) return
  c.__circleScaleSyncAttached = true

  circle.on('modified', () => {
    const radius = Number(circle.radius ?? 0)
    const sx = Number(circle.scaleX ?? 1)
    const sy = Number(circle.scaleY ?? 1)

    if (!radius || radius <= 0) return
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return
    if (Math.abs(sx - 1) < 0.0001 && Math.abs(sy - 1) < 0.0001) return

    const uniformScale = (sx + sy) / 2 || 1
    const nextRadius = normalizeCircleRadius(radius * uniformScale)

    circle.set({
      radius: nextRadius,
      scaleX: 1,
      scaleY: 1,
    } as any)

    circle.setCoords()
    applyCircleFill(circle)

    const idOnCircle = (circle as any).id
    if (idOnCircle) {
      const store = useElementDataStore()
      store.patchElement(String(idOnCircle), {
        left: circle.left as number,
        top: circle.top as number,
        radius: circle.radius as number,
        fill: (circle as any).solidFill as string,
        stroke: circle.stroke as string,
        strokeWidth: circle.strokeWidth as number,
        opacity: circle.opacity as number,
        gradientEnabled: Boolean((circle as any).gradientEnabled),
        gradientStartColor: (circle as any).gradientStartColor,
        gradientEndColor: (circle as any).gradientEndColor,
        gradientDirection: normalizeRectangleGradientDirection((circle as any).gradientDirection),
      } as any)
    }

    circle.canvas?.requestRenderAll()
  })
}

export async function createCircle(config: CircleElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()

  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add circle element')
  }

  const id = config.id || nanoid()

  const radius = normalizeCircleRadius(config.radius)
  const fill = config.fill || 'transparent'
  const stroke = config.stroke || '#FFFFFF'
  const strokeWidth = Number(config.strokeWidth ?? 0)
  const opacity = config.opacity != null ? Number(config.opacity) : 1
  const gradientEnabled = Boolean(config.gradientEnabled ?? false)
  const gradientStartColor = config.gradientStartColor ?? String(fill)
  const gradientEndColor = config.gradientEndColor ?? String(fill)
  const gradientDirection = normalizeRectangleGradientDirection(config.gradientDirection)

  const circleOptions: any = {
    id,
    eleType: 'circle',
    left: Number(config.left) || 0,
    top: Number(config.top) || 0,
    radius,
    fill,
    solidFill: fill,
    gradientEnabled,
    gradientStartColor,
    gradientEndColor,
    gradientDirection,
    stroke,
    strokeWidth,
    opacity,
    originX: (config.originX as any) ?? 'center',
    originY: (config.originY as any) ?? 'center',
    selectable: true,
    hasControls: true,
    hasBorders: true,
    initialConfig: {
      radius,
      fill,
      stroke,
      strokeWidth,
      opacity,
      gradientEnabled,
      gradientStartColor,
      gradientEndColor,
      gradientDirection,
    },
  }

  const circle = new Circle(circleOptions)
  applyCircleFill(circle)

  attachCircleScaleSync(circle)

  elementDataStore.upsertElement({
    id: String(id),
    eleType: 'circle',
    left: circle.left,
    top: circle.top,
    radius: circle.radius,
    fill,
    stroke: circle.stroke,
    strokeWidth: circle.strokeWidth,
    opacity: circle.opacity,
    gradientEnabled,
    gradientStartColor,
    gradientEndColor,
    gradientDirection,
    originX: circle.originX,
    originY: circle.originY,
  } as any)

  canvas.add(circle as any)
  layerStore.addLayer(circle as any)
  canvas.renderAll()
  canvas.setActiveObject(circle as any)

  return circle as any
}

export function updateCircle(element: FabricElement, patch: Partial<CircleElementConfig> = {}): void {
  const circle = element as any
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  const elementDataStore = useElementDataStore()

  if (!canvas || !circle) return

  if (patch.radius !== undefined) {
    circle.set('radius', normalizeCircleRadius(patch.radius))
  }

  if (patch.fill !== undefined) {
    circle.set('solidFill', patch.fill)
  }

  if (patch.gradientEnabled !== undefined) circle.set('gradientEnabled', Boolean(patch.gradientEnabled))
  if (patch.gradientStartColor !== undefined) circle.set('gradientStartColor', patch.gradientStartColor)
  if (patch.gradientEndColor !== undefined) circle.set('gradientEndColor', patch.gradientEndColor)
  if (patch.gradientDirection !== undefined) {
    circle.set('gradientDirection', normalizeRectangleGradientDirection(patch.gradientDirection))
  }

  if (patch.stroke !== undefined) {
    circle.set('stroke', patch.stroke)
    circle.set('dirty', true)
  }

  if (patch.strokeWidth !== undefined) {
    circle.set('strokeWidth', Number(patch.strokeWidth))
    circle.set('dirty', true)
  }

  if (patch.opacity !== undefined) {
    circle.set('opacity', Number(patch.opacity))
  }

  if (patch.left !== undefined) {
    circle.set('left', Number(patch.left))
  }

  if (patch.top !== undefined) {
    circle.set('top', Number(patch.top))
  }

  applyCircleFill(circle)

  circle.initialConfig = {
    radius: circle.radius,
    fill: circle.solidFill,
    stroke: circle.stroke,
    strokeWidth: circle.strokeWidth,
    opacity: circle.opacity,
    gradientEnabled: Boolean(circle.gradientEnabled),
    gradientStartColor: circle.gradientStartColor,
    gradientEndColor: circle.gradientEndColor,
    gradientDirection: normalizeRectangleGradientDirection(circle.gradientDirection),
  }

  circle.setCoords()
  circle.dirty = true
  canvas.renderAll?.()

  const id = circle.id
  if (id != null) {
    elementDataStore.patchElement(String(id), {
      left: circle.left as number,
      top: circle.top as number,
      radius: circle.radius as number,
      fill: circle.solidFill as string,
      stroke: circle.stroke as string,
      strokeWidth: circle.strokeWidth as number,
      opacity: circle.opacity as number,
      gradientEnabled: Boolean(circle.gradientEnabled),
      gradientStartColor: circle.gradientStartColor,
      gradientEndColor: circle.gradientEndColor,
      gradientDirection: normalizeRectangleGradientDirection(circle.gradientDirection),
    } as any)
  }
}
