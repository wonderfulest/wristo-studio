import type { FabricElement } from '@/types/element'
import type { CircleElementConfig } from '@/types/elements'
import { decodeColor, encodeColor } from '@/utils/colorUtils'
import { normalizeCircleRadius } from '@/elements/shapes/circle/circle.renderer'

export function encodeCircle(element: FabricElement): CircleElementConfig {
  if (!element) throw new Error('Invalid circle element')

  const circle = element as any

  const config: CircleElementConfig = {
    eleType: 'circle',
    id: String(circle.id ?? ''),
    left: Math.round(Number(circle.left ?? 0)),
    top: Math.round(Number(circle.top ?? 0)),
    radius: normalizeCircleRadius(circle.radius),
    fill: encodeColor(circle.fill as any) as any,
    stroke: (circle.stroke as string) ?? '#FFFFFF',
    strokeWidth: Number(circle.strokeWidth ?? 0),
    opacity: circle.opacity != null ? Number(circle.opacity) : undefined,
    originX: (circle.originX as any) ?? 'center',
    originY: (circle.originY as any) ?? 'center',
  }

  return config
}

export function decodeCircle(config: CircleElementConfig): Partial<FabricElement> {
  return {
    eleType: 'circle',
    id: config.id,
    left: config.left,
    top: config.top,
    radius: normalizeCircleRadius(config.radius),
    fill: decodeColor(config.fill as any),
    stroke: config.stroke,
    strokeWidth: config.strokeWidth,
    opacity: config.opacity,
    originX: config.originX as any,
    originY: config.originY as any,
  } as Partial<FabricElement>
}
