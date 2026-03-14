import type { FabricElement } from '@/types/element'
import type { RectangleElementConfig } from '@/types/elements'
import { decodeColor, encodeColor } from '@/utils/colorUtils'

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
    fill: encodeColor(rect.fill as any) as any,
    stroke: encodeColor(rect.stroke as any) as any,
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
    fill: decodeColor(config.fill as any),
    stroke: decodeColor(config.stroke as any),
    strokeWidth: config.strokeWidth,
    opacity: config.opacity,
    rx: config.borderRadius,
    ry: config.borderRadius,
    originX: config.originX as any,
    originY: config.originY as any,
  } as Partial<FabricElement>
}
