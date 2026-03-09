import type { FabricElement } from '@/types/element'
import type { RectangleElementConfig } from '@/types/elements'

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
    fill: (rect.fill as string) ?? undefined,
    stroke: (rect.stroke as string) ?? '#FFFFFF',
    strokeWidth: Number(rect.strokeWidth ?? 0),
    opacity: rect.opacity != null ? Number(rect.opacity) : undefined,
    borderRadius: Number((rect.rx ?? rect.ry ?? 0) as number),
    originX: (rect.originX as any) ?? 'center',
    originY: (rect.originY as any) ?? 'center',
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
    fill: config.fill,
    stroke: config.stroke,
    strokeWidth: config.strokeWidth,
    opacity: config.opacity,
    rx: config.borderRadius,
    ry: config.borderRadius,
    originX: config.originX as any,
    originY: config.originY as any,
  } as Partial<FabricElement>
}
