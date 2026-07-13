import { Polygon } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { PolygonElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { applyControlsToObject } from '@/utils/controlManager'
import { getDisplayState, normalizeDisplayStates } from '@/utils/displayStates'
import { createRectangleGradientFill, normalizeRectangleGradientDirection } from '../rectangle/rectangle.gradient'
import { denormalizePolygonPoints, isConvexPolygonPoints, normalizePolygonPoints, type PolygonPoint } from './polygon.geometry'

export function buildPolygonCanvasGeometry(points: PolygonPoint[], width: number, height: number) {
  const safeWidth = Math.max(1, Number(width) || 1)
  const safeHeight = Math.max(1, Number(height) || 1)
  return {
    points: denormalizePolygonPoints(normalizePolygonPoints(points), safeWidth, safeHeight),
    width: safeWidth,
    height: safeHeight,
    pathOffset: { x: safeWidth / 2, y: safeHeight / 2 },
  }
}

function applyPolygonGeometry(polygon: Polygon, points: PolygonPoint[], width: number, height: number): void {
  const geometry = buildPolygonCanvasGeometry(points, width, height)
  polygon.set({
    points: geometry.points,
    width: geometry.width,
    height: geometry.height,
    pathOffset: geometry.pathOffset,
    logicalWidth: geometry.width,
    logicalHeight: geometry.height,
    polygonPoints: normalizePolygonPoints(points),
  } as any)
  polygon.setCoords()
}

function applyPolygonFill(polygon: Polygon): void {
  const item = polygon as any
  const solidFill = item.solidFill ?? 'transparent'
  const gradientEnabled = isConvexPolygonPoints(item.polygonPoints) && Boolean(item.gradientEnabled)
  item.gradientEnabled = gradientEnabled
  const gradient = createRectangleGradientFill({
    enabled: gradientEnabled,
    startColor: item.gradientStartColor ?? solidFill,
    endColor: item.gradientEndColor ?? solidFill,
    direction: normalizeRectangleGradientDirection(item.gradientDirection),
    width: Number(item.logicalWidth ?? item.width ?? 0),
    height: Number(item.logicalHeight ?? item.height ?? 0),
  })
  polygon.set('fill', gradient ?? solidFill)
}

function persistPolygon(polygon: Polygon): void {
  const item = polygon as any
  useElementDataStore().patchElement(String(item.id), {
    left: polygon.left,
    top: polygon.top,
    width: item.logicalWidth,
    height: item.logicalHeight,
    polygonPoints: normalizePolygonPoints(item.polygonPoints),
    fill: item.solidFill,
    stroke: polygon.stroke,
    strokeWidth: polygon.strokeWidth,
    opacity: polygon.opacity,
    gradientEnabled: isConvexPolygonPoints(item.polygonPoints) && Boolean(item.gradientEnabled),
    gradientStartColor: item.gradientStartColor,
    gradientEndColor: item.gradientEndColor,
    gradientDirection: normalizeRectangleGradientDirection(item.gradientDirection),
    displayStates: normalizeDisplayStates(item.displayStates),
  } as any)
}

function attachPolygonSync(polygon: Polygon): void {
  polygon.on('modified', () => {
    const item = polygon as any
    const width = Number(item.logicalWidth ?? polygon.width ?? 1) * Number(polygon.scaleX ?? 1)
    const height = Number(item.logicalHeight ?? polygon.height ?? 1) * Number(polygon.scaleY ?? 1)
    polygon.set({ scaleX: 1, scaleY: 1 })
    applyPolygonGeometry(polygon, item.polygonPoints, width, height)
    applyPolygonFill(polygon)
    persistPolygon(polygon)
    polygon.canvas?.requestRenderAll?.()
  })
}

export async function createPolygon(config: PolygonElementConfig): Promise<FabricElement> {
  const canvas = useCanvasStore().canvas
  if (!canvas) throw new Error('Canvas is not initialized, cannot add polygon element')
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()
  const id = config.id || nanoid()
  const width = Math.max(1, Number(config.width ?? 100))
  const height = Math.max(1, Number(config.height ?? 100))
  const polygonPoints = normalizePolygonPoints(config.polygonPoints)
  const geometry = buildPolygonCanvasGeometry(polygonPoints, width, height)
  const fill = config.fill || 'transparent'
  const displayStates = normalizeDisplayStates(config.displayStates)
  const polygon = new Polygon(geometry.points, {
    id,
    eleType: 'polygon',
    designerControlMode: 'resize8',
    left: Number(config.left) || 0,
    top: Number(config.top) || 0,
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
  polygon.set({
    logicalWidth: width,
    logicalHeight: height,
    polygonPoints,
    solidFill: fill,
    gradientEnabled: isConvexPolygonPoints(polygonPoints) && Boolean(config.gradientEnabled),
    gradientStartColor: config.gradientStartColor ?? String(fill),
    gradientEndColor: config.gradientEndColor ?? String(fill),
    gradientDirection: normalizeRectangleGradientDirection(config.gradientDirection),
    displayStates,
  } as any)
  applyPolygonGeometry(polygon, polygonPoints, width, height)
  applyPolygonFill(polygon)
  attachPolygonSync(polygon)
  applyControlsToObject(polygon)
  elementDataStore.upsertElement({ ...config, id: String(id), eleType: 'polygon', width, height, polygonPoints, displayStates } as any)
  canvas.add(polygon as any)
  layerStore.addLayer(polygon as any)
  canvas.setActiveObject(polygon as any)
  canvas.requestRenderAll()
  return polygon as any
}

export function updatePolygon(element: FabricElement, patch: Partial<PolygonElementConfig> = {}): void {
  const polygon = element as unknown as Polygon
  const item = polygon as any
  if (!polygon) return
  const points = patch.polygonPoints === undefined ? item.polygonPoints : normalizePolygonPoints(patch.polygonPoints)
  const width = patch.width === undefined ? Number(item.logicalWidth ?? polygon.width) : Number(patch.width)
  const height = patch.height === undefined ? Number(item.logicalHeight ?? polygon.height) : Number(patch.height)
  if (patch.left !== undefined) polygon.set('left', Number(patch.left))
  if (patch.top !== undefined) polygon.set('top', Number(patch.top))
  if (patch.fill !== undefined) item.solidFill = patch.fill
  if (patch.stroke !== undefined) polygon.set('stroke', patch.stroke)
  if (patch.strokeWidth !== undefined) polygon.set('strokeWidth', Number(patch.strokeWidth))
  if (patch.opacity !== undefined) polygon.set('opacity', Number(patch.opacity))
  if (patch.gradientEnabled !== undefined) item.gradientEnabled = Boolean(patch.gradientEnabled)
  if (patch.gradientStartColor !== undefined) item.gradientStartColor = patch.gradientStartColor
  if (patch.gradientEndColor !== undefined) item.gradientEndColor = patch.gradientEndColor
  if (patch.gradientDirection !== undefined) item.gradientDirection = normalizeRectangleGradientDirection(patch.gradientDirection)
  if (patch.displayStates !== undefined) {
    item.displayStates = normalizeDisplayStates(patch.displayStates)
    polygon.set('visible', getDisplayState(item.displayStates, useLayerStore().previewMode))
  }
  applyPolygonGeometry(polygon, points, width, height)
  applyPolygonFill(polygon)
  persistPolygon(polygon)
  polygon.set('dirty', true)
  polygon.canvas?.requestRenderAll?.()
}
