import type { FabricElement } from '@/types/element'
import type { GridLinesElementConfig } from '@/types/elements'
import { decodeColor, encodeColor } from '@/utils/colorUtils'
import { normalizeGridLinesSize } from './gridLines.geometry'

export function encodeGridLines(element: FabricElement): GridLinesElementConfig {
  if (!element) throw new Error('Invalid Grid Lines element')

  const grid = element as any
  const size = normalizeGridLinesSize(grid.width, grid.height, grid.scaleX, grid.scaleY)

  return {
    eleType: 'gridLines',
    id: String(grid.id ?? ''),
    left: Math.round(Number(grid.left ?? 0)),
    top: Math.round(Number(grid.top ?? 0)),
    width: size.width,
    height: size.height,
    spacing: Number(grid.spacing ?? 20),
    lineWidth: Number(grid.lineWidth ?? 1),
    color: encodeColor(grid.color ?? '#FFFFFF') as string,
    colorProperty: grid.colorProperty ?? null,
    rotation: Number(grid.angle ?? grid.rotation ?? 0),
    originX: (grid.originX as any) ?? 'center',
    originY: (grid.originY as any) ?? 'center',
  }
}

export function decodeGridLines(config: GridLinesElementConfig): Partial<FabricElement> {
  const rotation = Number(config.rotation ?? 0)
  return {
    eleType: 'gridLines',
    id: config.id,
    left: config.left,
    top: config.top,
    width: config.width,
    height: config.height,
    spacing: config.spacing,
    lineWidth: config.lineWidth,
    color: decodeColor(config.color),
    colorProperty: config.colorProperty ?? null,
    rotation,
    angle: rotation,
    originX: config.originX ?? 'center',
    originY: config.originY ?? 'center',
  } as Partial<FabricElement>
}
