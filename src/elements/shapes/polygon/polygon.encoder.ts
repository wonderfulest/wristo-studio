import type { FabricElement } from '@/types/element'
import type { PolygonElementConfig } from '@/types/elements'
import { decodeColor, encodeColor } from '@/utils/colorUtils'
import { normalizeRectangleGradientDirection } from '../rectangle/rectangle.gradient'
import { isConvexPolygonPoints, isValidPolygonPoints, normalizePolygonPoints } from './polygon.geometry'

const INVALID_POLYGON_WARNING = '[Polygon] Invalid polygonPoints; falling back to default hexagon'

function normalizedWithWarning(value: unknown): Array<{ x: number; y: number }> {
  if (!isValidPolygonPoints(value)) console.warn(INVALID_POLYGON_WARNING)
  return normalizePolygonPoints(value)
}

export function encodePolygon(element: FabricElement): PolygonElementConfig {
  if (!element) throw new Error('Invalid polygon element')
  const polygon = element as any
  return {
    eleType: 'polygon',
    id: String(polygon.id ?? ''),
    left: Math.round(Number(polygon.left ?? 0)),
    top: Math.round(Number(polygon.top ?? 0)),
    width: Number(polygon.logicalWidth ?? polygon.width ?? 0),
    height: Number(polygon.logicalHeight ?? polygon.height ?? 0),
    polygonPoints: normalizedWithWarning(polygon.polygonPoints),
    fill: encodeColor((polygon.solidFill ?? polygon.fill) as any) as any,
    stroke: encodeColor(polygon.stroke as any) as any,
    strokeWidth: Number(polygon.strokeWidth ?? 0),
    opacity: polygon.opacity == null ? 1 : Number(polygon.opacity),
    originX: (polygon.originX as any) ?? 'center',
    originY: (polygon.originY as any) ?? 'center',
    gradientEnabled: isConvexPolygonPoints(polygon.polygonPoints) && Boolean(polygon.gradientEnabled),
    gradientStartColor: String(polygon.gradientStartColor ?? polygon.solidFill ?? polygon.fill ?? '#FFFFFF'),
    gradientEndColor: String(polygon.gradientEndColor ?? polygon.solidFill ?? polygon.fill ?? '#FFFFFF'),
    gradientDirection: normalizeRectangleGradientDirection(polygon.gradientDirection),
  }
}

export function decodePolygon(config: PolygonElementConfig): Partial<FabricElement> {
  const polygonPoints = normalizedWithWarning(config.polygonPoints)
  return {
    eleType: 'polygon',
    id: config.id,
    left: config.left,
    top: config.top,
    width: config.width,
    height: config.height,
    logicalWidth: config.width,
    logicalHeight: config.height,
    polygonPoints,
    fill: decodeColor(config.fill as any),
    solidFill: decodeColor(config.fill as any),
    stroke: decodeColor(config.stroke as any),
    strokeWidth: config.strokeWidth,
    opacity: config.opacity,
    originX: config.originX as any,
    originY: config.originY as any,
    gradientEnabled: isConvexPolygonPoints(polygonPoints) && Boolean(config.gradientEnabled),
    gradientStartColor: config.gradientStartColor ?? String(decodeColor(config.fill as any)),
    gradientEndColor: config.gradientEndColor ?? String(decodeColor(config.fill as any)),
    gradientDirection: normalizeRectangleGradientDirection(config.gradientDirection),
  } as Partial<FabricElement>
}
