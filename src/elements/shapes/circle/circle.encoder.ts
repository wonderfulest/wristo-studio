import type { FabricElement } from '@/types/element'
import type { CircleElementConfig } from '@/types/elements'

export function encodeCircle(element: FabricElement): CircleElementConfig {
  if (!element) throw new Error('Invalid circle element')

  const circle = element as any

  const config: CircleElementConfig = {
    eleType: 'circle',
    id: String(circle.id ?? ''),
    left: Math.round(Number(circle.left ?? 0)),
    top: Math.round(Number(circle.top ?? 0)),
    radius: Number(circle.radius ?? 0),
    fill: (circle.fill as string) ?? undefined,
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
    radius: config.radius,
    fill: config.fill,
    stroke: config.stroke,
    strokeWidth: config.strokeWidth,
    opacity: config.opacity,
    originX: config.originX as any,
    originY: config.originY as any,
  } as Partial<FabricElement>
}
