import type { FabricElement } from '@/types/element'
import type { CircleElementConfig } from '@/types/elements'
import { decodeColor, encodeColor } from '@/utils/colorUtils'
import { normalizeCircleRadius } from '@/elements/shapes/circle/circle.renderer'
import { normalizeRectangleGradientDirection } from '@/elements/shapes/rectangle/rectangle.gradient'

export function encodeCircle(element: FabricElement): CircleElementConfig {
  if (!element) throw new Error('Invalid circle element')

  const circle = element as any
  const fill = circle.solidFill ?? circle.fill ?? 'transparent'

  const config: CircleElementConfig = {
    eleType: 'circle',
    id: String(circle.id ?? ''),
    left: Math.round(Number(circle.left ?? 0)),
    top: Math.round(Number(circle.top ?? 0)),
    radius: normalizeCircleRadius(circle.radius),
    fill: encodeColor(fill as any) as any,
    stroke: (circle.stroke as string) ?? '#FFFFFF',
    strokeWidth: Number(circle.strokeWidth ?? 0),
    opacity: circle.opacity != null ? Number(circle.opacity) : undefined,
    gradientEnabled: Boolean(circle.gradientEnabled ?? false),
    gradientStartColor: String(circle.gradientStartColor ?? fill),
    gradientEndColor: String(circle.gradientEndColor ?? fill),
    gradientDirection: normalizeRectangleGradientDirection(circle.gradientDirection),
    originX: (circle.originX as any) ?? 'center',
    originY: (circle.originY as any) ?? 'center',
  }

  return config
}

export function decodeCircle(config: CircleElementConfig): Partial<FabricElement> {
  const fill = decodeColor(config.fill as any)
  return {
    eleType: 'circle',
    id: config.id,
    left: config.left,
    top: config.top,
    radius: normalizeCircleRadius(config.radius),
    fill,
    solidFill: fill,
    stroke: config.stroke,
    strokeWidth: config.strokeWidth,
    opacity: config.opacity,
    gradientEnabled: Boolean(config.gradientEnabled ?? false),
    gradientStartColor: config.gradientStartColor ?? String(fill),
    gradientEndColor: config.gradientEndColor ?? String(fill),
    gradientDirection: normalizeRectangleGradientDirection(config.gradientDirection),
    originX: config.originX as any,
    originY: config.originY as any,
  } as Partial<FabricElement>
}
