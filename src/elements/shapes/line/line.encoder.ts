import type { FabricElement } from '@/types/element'
import type { LineElementConfig } from '@/types/elements'

export function encodeLine(element: FabricElement): LineElementConfig {
  if (!element) throw new Error('Invalid line element')

  const line = element as any

  const config: LineElementConfig = {
    eleType: 'line',
    id: String(line.id ?? ''),
    left: Math.round(Number(line.left ?? 0)),
    top: Math.round(Number(line.top ?? 0)),
    x1: Number(line.x1 ?? 0),
    y1: Number(line.y1 ?? 0),
    x2: Number(line.x2 ?? 0),
    y2: Number(line.y2 ?? 0),
    stroke: (line.stroke as string) ?? '#FFFFFF',
    strokeWidth: Number(line.strokeWidth ?? 0),
    opacity: line.opacity != null ? Number(line.opacity) : undefined,
    originX: (line.originX as any) ?? 'center',
    originY: (line.originY as any) ?? 'center',
  }

  return config
}

export function decodeLine(config: LineElementConfig): Partial<FabricElement> {
  return {
    eleType: 'line',
    id: config.id,
    left: config.left,
    top: config.top,
    x1: config.x1,
    y1: config.y1,
    x2: config.x2,
    y2: config.y2,
    stroke: config.stroke,
    strokeWidth: config.strokeWidth,
    opacity: config.opacity,
    originX: config.originX as any,
    originY: config.originY as any,
  } as Partial<FabricElement>
}
