import { Circle } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { CircleElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'

export const MIN_CIRCLE_RADIUS = 3

export function normalizeCircleRadius(value: unknown): number {
  const radius = Number(value ?? 50)
  if (!Number.isFinite(radius)) return MIN_CIRCLE_RADIUS
  return Math.max(MIN_CIRCLE_RADIUS, Math.round(radius))
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

    const idOnCircle = (circle as any).id
    if (idOnCircle) {
      const store = useElementDataStore()
      store.patchElement(String(idOnCircle), {
        left: circle.left as number,
        top: circle.top as number,
        radius: circle.radius as number,
        fill: circle.fill as string,
        stroke: circle.stroke as string,
        strokeWidth: circle.strokeWidth as number,
        opacity: circle.opacity as number,
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

  const circleOptions: any = {
    id,
    eleType: 'circle',
    left: Number(config.left) || 0,
    top: Number(config.top) || 0,
    radius,
    fill,
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
    },
  }

  const circle = new Circle(circleOptions)

  attachCircleScaleSync(circle)

  elementDataStore.upsertElement({
    id: String(id),
    eleType: 'circle',
    left: circle.left,
    top: circle.top,
    radius: circle.radius,
    fill: circle.fill,
    stroke: circle.stroke,
    strokeWidth: circle.strokeWidth,
    opacity: circle.opacity,
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
    circle.set('fill', patch.fill)
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

  circle.initialConfig = {
    radius: circle.radius,
    fill: circle.fill,
    stroke: circle.stroke,
    strokeWidth: circle.strokeWidth,
    opacity: circle.opacity,
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
      fill: circle.fill as string,
      stroke: circle.stroke as string,
      strokeWidth: circle.strokeWidth as number,
      opacity: circle.opacity as number,
    } as any)
  }
}
