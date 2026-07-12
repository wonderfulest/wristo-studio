import type { FabricElement } from '@/types/element'
import type { RectangleElementConfig } from '@/types/elements'
import { decodeColor, encodeColor } from '@/utils/colorUtils'
import { normalizeRectangleGradientDirection } from './rectangle.gradient'

export function encodeRectangle(element: FabricElement): RectangleElementConfig {
  if (!element) throw new Error('Invalid rectangle element')

  const rect = element as any

  const config: RectangleElementConfig = {
    eleType: 'rectangle',
    id: String(rect.id ?? ''),
    left: Math.round(Number(rect.left ?? 0)),
    top: Math.round(Number(rect.top ?? 0)),
    width: Number(rect.width ?? 0),
    height: Number(rect.height ?? 0),
    fill: encodeColor((rect.solidFill ?? rect.fill) as any) as any,
    stroke: encodeColor(rect.stroke as any) as any,
    strokeWidth: Number(rect.strokeWidth ?? 0),
    opacity: rect.opacity != null ? Number(rect.opacity) : undefined,
    borderRadius: Number((rect.rx ?? rect.ry ?? 0) as number),
    originX: (rect.originX as any) ?? 'center',
    originY: (rect.originY as any) ?? 'center',
    gradientEnabled: Boolean(rect.gradientEnabled ?? false),
    gradientStartColor: String(rect.gradientStartColor ?? rect.solidFill ?? rect.fill ?? '#FFFFFF'),
    gradientEndColor: String(rect.gradientEndColor ?? rect.solidFill ?? rect.fill ?? '#FFFFFF'),
    gradientDirection: normalizeRectangleGradientDirection(rect.gradientDirection),
  }

  return config
}

export function decodeRectangle(config: RectangleElementConfig): Partial<FabricElement> {
  return {
    eleType: 'rectangle',
    id: config.id,
    left: config.left,
    top: config.top,
    width: config.width,
    height: config.height,
    fill: decodeColor(config.fill as any),
    stroke: decodeColor(config.stroke as any),
    strokeWidth: config.strokeWidth,
    opacity: config.opacity,
    rx: config.borderRadius,
    ry: config.borderRadius,
    originX: config.originX as any,
    originY: config.originY as any,
    gradientEnabled: Boolean(config.gradientEnabled ?? false),
    gradientStartColor: config.gradientStartColor ?? String(decodeColor(config.fill as any)),
    gradientEndColor: config.gradientEndColor ?? String(decodeColor(config.fill as any)),
    gradientDirection: normalizeRectangleGradientDirection(config.gradientDirection),
  } as Partial<FabricElement>
}
