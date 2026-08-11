import { Polygon } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { TriangleElementConfig } from '@/types/elements'
import type { ElementUpdateContext } from '@/engine/registry/elementRegistry'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useLayerStore } from '@/stores/layerStore'
import { applyControlsToObject } from '@/utils/controlManager'
import { getDisplayState, normalizeDisplayStates } from '@/utils/displayStates'
import { createRectangleGradientFill, normalizeRectangleGradientDirection } from '../rectangle/rectangle.gradient'
import { buildTriangleCanvasGeometry } from './triangle.geometry'

function applyTriangleGeometry(triangle: Polygon, width: number, height: number): void {
  const geometry = buildTriangleCanvasGeometry(width, height)
  triangle.set({
    points: geometry.points,
    width: geometry.width,
    height: geometry.height,
    pathOffset: geometry.pathOffset,
    logicalWidth: geometry.width,
    logicalHeight: geometry.height,
  } as any)
  triangle.setCoords()
}

function applyTriangleFill(triangle: Polygon): void {
  const item = triangle as any
  const solidFill = item.solidFill ?? 'transparent'
  const gradient = createRectangleGradientFill({
    enabled: Boolean(item.gradientEnabled),
    startColor: item.gradientStartColor ?? solidFill,
    endColor: item.gradientEndColor ?? solidFill,
    direction: normalizeRectangleGradientDirection(item.gradientDirection),
    width: Number(item.logicalWidth ?? item.width ?? 0),
    height: Number(item.logicalHeight ?? item.height ?? 0),
  })
  triangle.set('fill', gradient ?? solidFill)
}

function persistTriangle(triangle: Polygon, context: ElementUpdateContext = {}): void {
  if (context.persist === false) return
  const item = triangle as any
  useElementDataStore().patchElement(String(item.id), {
    left: triangle.left,
    top: triangle.top,
    width: item.logicalWidth,
    height: item.logicalHeight,
    rotation: Number(triangle.angle ?? 0),
    fill: item.solidFill,
    stroke: triangle.stroke,
    strokeWidth: triangle.strokeWidth,
    opacity: triangle.opacity,
    gradientEnabled: Boolean(item.gradientEnabled),
    gradientStartColor: item.gradientStartColor,
    gradientEndColor: item.gradientEndColor,
    gradientDirection: normalizeRectangleGradientDirection(item.gradientDirection),
    displayStates: normalizeDisplayStates(item.displayStates),
  } as any)
}

function attachTriangleSync(triangle: Polygon): void {
  triangle.on('modified', () => {
    const item = triangle as any
    const width = Number(item.logicalWidth ?? triangle.width ?? 1) * Number(triangle.scaleX ?? 1)
    const height = Number(item.logicalHeight ?? triangle.height ?? 1) * Number(triangle.scaleY ?? 1)
    triangle.set({ scaleX: 1, scaleY: 1 })
    applyTriangleGeometry(triangle, width, height)
    applyTriangleFill(triangle)
    persistTriangle(triangle)
    triangle.canvas?.requestRenderAll?.()
  })
}

export async function createTriangle(config: TriangleElementConfig): Promise<FabricElement> {
  const canvas = useCanvasStore().canvas
  if (!canvas) throw new Error('Canvas is not initialized, cannot add triangle element')
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()
  const id = config.id || nanoid()
  const geometry = buildTriangleCanvasGeometry(Number(config.width ?? 100), Number(config.height ?? 100))
  const fill = config.fill || 'transparent'
  const displayStates = normalizeDisplayStates(config.displayStates)
  const triangle = new Polygon(geometry.points, {
    id,
    eleType: 'triangle',
    designerControlMode: 'resize8Rotate',
    left: Number(config.left) || 0,
    top: Number(config.top) || 0,
    angle: Number(config.rotation ?? 0),
    originX: (config.originX as any) ?? 'center',
    originY: (config.originY as any) ?? 'center',
    fill,
    stroke: config.stroke || '#FFFFFF',
    strokeWidth: Number(config.strokeWidth ?? 0),
    opacity: config.opacity == null ? 1 : Number(config.opacity),
    selectable: true,
    hasControls: true,
    hasBorders: true,
    lockScalingFlip: true,
    visible: getDisplayState(displayStates, layerStore.previewMode),
  } as any)
  triangle.set({
    solidFill: fill,
    gradientEnabled: Boolean(config.gradientEnabled),
    gradientStartColor: config.gradientStartColor ?? String(fill),
    gradientEndColor: config.gradientEndColor ?? String(fill),
    gradientDirection: normalizeRectangleGradientDirection(config.gradientDirection),
    displayStates,
  } as any)
  applyTriangleGeometry(triangle, geometry.width, geometry.height)
  applyTriangleFill(triangle)
  attachTriangleSync(triangle)
  applyControlsToObject(triangle)
  elementDataStore.upsertElement({ ...config, id: String(id), eleType: 'triangle', width: geometry.width, height: geometry.height, rotation: Number(config.rotation ?? 0), displayStates } as any)
  canvas.add(triangle as any)
  layerStore.addLayer(triangle as any)
  canvas.setActiveObject(triangle as any)
  canvas.requestRenderAll()
  return triangle as any
}

export function updateTriangle(element: FabricElement, patch: Partial<TriangleElementConfig> = {}, context: ElementUpdateContext = {}): void {
  const triangle = element as unknown as Polygon
  const item = triangle as any
  if (!triangle) return
  if (patch.left !== undefined) triangle.set('left', Number(patch.left))
  if (patch.top !== undefined) triangle.set('top', Number(patch.top))
  if (patch.rotation !== undefined) triangle.set('angle', Number(patch.rotation))
  if (patch.fill !== undefined) item.solidFill = patch.fill
  if (patch.stroke !== undefined) triangle.set('stroke', patch.stroke)
  if (patch.strokeWidth !== undefined) triangle.set('strokeWidth', Number(patch.strokeWidth))
  if (patch.opacity !== undefined) triangle.set('opacity', Number(patch.opacity))
  if (patch.gradientEnabled !== undefined) item.gradientEnabled = Boolean(patch.gradientEnabled)
  if (patch.gradientStartColor !== undefined) item.gradientStartColor = patch.gradientStartColor
  if (patch.gradientEndColor !== undefined) item.gradientEndColor = patch.gradientEndColor
  if (patch.gradientDirection !== undefined) item.gradientDirection = normalizeRectangleGradientDirection(patch.gradientDirection)
  if (patch.displayStates !== undefined) {
    item.displayStates = normalizeDisplayStates(patch.displayStates)
    triangle.set('visible', getDisplayState(item.displayStates, useLayerStore().previewMode))
  }
  applyTriangleGeometry(
    triangle,
    patch.width === undefined ? Number(item.logicalWidth ?? triangle.width) : Number(patch.width),
    patch.height === undefined ? Number(item.logicalHeight ?? triangle.height) : Number(patch.height),
  )
  applyTriangleFill(triangle)
  persistTriangle(triangle, context)
  triangle.set('dirty', true)
  triangle.canvas?.requestRenderAll?.()
}
