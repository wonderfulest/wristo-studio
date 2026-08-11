import type { FabricElement } from '@/types/element'
import type { TriangleElementConfig } from '@/types/elements'
import { decodeColor, encodeColor } from '@/utils/colorUtils'
import { normalizeRectangleGradientDirection } from '../rectangle/rectangle.gradient'

export function encodeTriangle(element: FabricElement): TriangleElementConfig {
  if (!element) throw new Error('Invalid triangle element')
  const triangle = element as any
  return {
    eleType: 'triangle',
    id: String(triangle.id ?? ''),
    left: Math.round(Number(triangle.left ?? 0)),
    top: Math.round(Number(triangle.top ?? 0)),
    width: Number(triangle.logicalWidth ?? triangle.width ?? 0),
    height: Number(triangle.logicalHeight ?? triangle.height ?? 0),
    rotation: Number(triangle.angle ?? triangle.rotation ?? 0),
    fill: encodeColor((triangle.solidFill ?? triangle.fill) as any) as any,
    stroke: encodeColor(triangle.stroke as any) as any,
    strokeWidth: Number(triangle.strokeWidth ?? 0),
    opacity: triangle.opacity == null ? 1 : Number(triangle.opacity),
    originX: (triangle.originX as any) ?? 'center',
    originY: (triangle.originY as any) ?? 'center',
    gradientEnabled: Boolean(triangle.gradientEnabled),
    gradientStartColor: String(triangle.gradientStartColor ?? triangle.solidFill ?? triangle.fill ?? '#FFFFFF'),
    gradientEndColor: String(triangle.gradientEndColor ?? triangle.solidFill ?? triangle.fill ?? '#FFFFFF'),
    gradientDirection: normalizeRectangleGradientDirection(triangle.gradientDirection),
  }
}

export function decodeTriangle(config: TriangleElementConfig): Partial<FabricElement> {
  return {
    eleType: 'triangle',
    id: config.id,
    left: config.left,
    top: config.top,
    width: config.width,
    height: config.height,
    logicalWidth: config.width,
    logicalHeight: config.height,
    angle: Number(config.rotation ?? 0),
    rotation: Number(config.rotation ?? 0),
    fill: decodeColor(config.fill as any),
    solidFill: decodeColor(config.fill as any),
    stroke: decodeColor(config.stroke as any),
    strokeWidth: config.strokeWidth,
    opacity: config.opacity,
    originX: config.originX as any,
    originY: config.originY as any,
    gradientEnabled: Boolean(config.gradientEnabled),
    gradientStartColor: config.gradientStartColor ?? String(decodeColor(config.fill as any)),
    gradientEndColor: config.gradientEndColor ?? String(decodeColor(config.fill as any)),
    gradientDirection: normalizeRectangleGradientDirection(config.gradientDirection),
  } as Partial<FabricElement>
}
