import type { FabricElement } from '@/types/element'
import type { GoalBarElementConfig } from '@/types/elements/goal'

export function encodeGoalBar(element: Partial<FabricElement>): GoalBarElementConfig {
  if (!element) {
    throw new Error('Invalid element')
  }

  const objects = (element as any).getObjects?.() ?? []
  const background: any = objects.find((obj: any) => (obj as any).id?.endsWith?.('_background'))

  const result: Partial<GoalBarElementConfig> = {
    eleType: 'goalBar',
    left: (element as any).left,
    top: (element as any).top,
    width: background?.width,
    height: background?.height,
    color: (element as any).color,
    bgColor: (element as any).bgColor,
    borderRadius: (element as any).borderRadius,
    progress: (element as any).progress,
    padding: (element as any).padding,
    originX: (element as any).originX,
    originY: background?.originY,
    borderWidth: (element as any).borderWidth,
    borderColor: (element as any).borderColor,
    goalProperty: (element as any).goalProperty,
    progressAlign: (element as any).progressAlign,
  }

  return result as GoalBarElementConfig
}

export function decodeGoalBar(config: GoalBarElementConfig): Partial<FabricElement> {
  const result: Partial<FabricElement> = {
    eleType: 'goalBar',
    left: config.left,
    top: config.top,
    width: config.width,
    height: config.height,
    color: config.color,
    bgColor: config.bgColor,
    borderRadius: config.borderRadius,
    progress: config.progress,
    padding: config.padding,
    originX: config.originX as any,
    originY: config.originY as any,
    borderWidth: config.borderWidth,
    borderColor: config.borderColor,
    goalProperty: config.goalProperty,
    progressAlign: config.progressAlign,
  }

  return result
}
