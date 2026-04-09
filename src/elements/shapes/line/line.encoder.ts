import type { FabricElement } from '@/types/element'
import type { LineElementConfig } from '@/types/elements'
import { rectToPoints, pointsToRect } from './line.renderer'

export function encodeLine(element: FabricElement): LineElementConfig {
  if (!element) throw new Error('Invalid line element')

  const rect = element as any
  const pts = rectToPoints(rect)

  const config: LineElementConfig = {
    eleType: 'line',
    id: String(rect.id ?? ''),
    left: Math.round(Number(rect.left ?? 0)),
    top: Math.round(Number(rect.top ?? 0)),
    x1: pts.x1,
    y1: pts.y1,
    x2: pts.x2,
    y2: pts.y2,
    stroke: (rect.fill as string) ?? '#FFFFFF',
    strokeWidth: Math.round(Number(rect.height ?? 2)),
    opacity: rect.opacity != null ? Number(rect.opacity) : undefined,
    originX: (rect.originX as any) ?? 'center',
    originY: (rect.originY as any) ?? 'center',
  }

  if (rect.strokeDashArray) {
    ;(config as any).strokeDashArray = rect.strokeDashArray
  }

  return config
}

export function decodeLine(config: LineElementConfig): Partial<FabricElement> {
  const strokeWidth = Math.max(1, Number(config.strokeWidth) || 2)
  const x1 = config.x1 ?? 50
  const y1 = config.y1 ?? 50
  const x2 = config.x2 ?? 200
  const y2 = config.y2 ?? 50
  const { left, top, width, height, angle } = pointsToRect(x1, y1, x2, y2, strokeWidth)

  return {
    eleType: 'line',
    id: config.id,
    left,
    top,
    width,
    height,
    angle,
    fill: config.stroke,
    strokeWidth: 0,
    originX: 'center' as any,
    originY: 'center' as any,
    opacity: config.opacity,
    strokeDashArray: (config as any).strokeDashArray ?? null,
  } as Partial<FabricElement>
}
