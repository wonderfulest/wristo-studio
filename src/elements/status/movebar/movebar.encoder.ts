import type { FabricElement } from '@/types/element'
import type { MoveBarElementConfig } from '@/types/elements/status'
import { nanoid } from 'nanoid'

export function encodeMoveBar(element: FabricElement): MoveBarElementConfig {
  const id = String((element as any).id ?? '')
  const originX = (((element as any).originX ?? 'center') as any)
  const originY = (((element as any).originY ?? 'center') as any)

  return {
    id,
    eleType: 'moveBar',
    left: Math.ceil((element as any).left ?? 0),
    top: Math.ceil((element as any).top ?? 0),
    originX,
    originY,
    width: Math.ceil((element as any).width ?? 0),
    height: Math.ceil((element as any).height ?? 0),
    separator: Math.ceil((element as any).separator ?? 0),
    level: (element as any).level ?? 0,
    activeColor: (element as any).activeColor,
    inactiveColor: (element as any).inactiveColor,
  }
}

export function decodeMoveBar(config: MoveBarElementConfig): Partial<FabricElement> {
  return {
    eleType: 'moveBar',
    id: config.id ?? nanoid(),
    left: config.left,
    top: config.top,
    width: config.width,
    height: config.height,
    separator: config.separator,
    level: config.level,
    activeColor: config.activeColor ?? config.color,
    inactiveColor: config.inactiveColor ?? config.bgColor,
    originX: config.originX,
    originY: config.originY,
  } as Partial<FabricElement>
}
