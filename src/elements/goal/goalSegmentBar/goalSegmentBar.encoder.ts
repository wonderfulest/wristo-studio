import type { FabricElement } from '@/types/element'
import type { GoalSegmentBarElementConfig } from '@/types/elements/goal'
import { ensureGoalElementId, clampProgress } from '@/elements/goal/goal.common'

export function encodeGoalSegmentBar(element: Partial<FabricElement>): GoalSegmentBarElementConfig {
  if (!element) throw new Error('Invalid element')

  const anyElement = element as any
  const id = ensureGoalElementId(anyElement.id as string | undefined)

  const result: GoalSegmentBarElementConfig = {
    id,
    eleType: 'goalSegmentBar',
    left: Number(anyElement.left || 0),
    top: Number(anyElement.top || 0),
    width: Number(anyElement.designWidth ?? anyElement.width ?? 200),
    height: Number(anyElement.designHeight ?? anyElement.height ?? 12),
    color: anyElement.color,
    bgColor: anyElement.bgColor,
    borderRadius: Number(anyElement.borderRadius || 0),
    borderWidth: Number(anyElement.borderWidth || 0),
    borderColor: anyElement.borderColor || '#FFFFFF',
    segments: Number(anyElement.segments || 8),
    gap: Number(anyElement.gap || 2),
    progress: clampProgress(anyElement.progress ?? 0),
    originX: anyElement.originX,
    originY: anyElement.originY,
    goalProperty: anyElement.goalProperty || '',
  }

  return result
}

export function decodeGoalSegmentBar(config: GoalSegmentBarElementConfig): Partial<FabricElement> {
  const result: Partial<FabricElement> = {
    eleType: 'goalSegmentBar',
    left: config.left,
    top: config.top,
    width: config.width,
    height: config.height,
    color: config.color,
    bgColor: config.bgColor,
    borderRadius: config.borderRadius,
    borderWidth: config.borderWidth,
    borderColor: config.borderColor,
    originX: config.originX,
    originY: config.originY,
    goalProperty: config.goalProperty,
    segments: config.segments,
    gap: config.gap,
    progress: clampProgress(config.progress),
    designWidth: config.width,
    designHeight: config.height,
  }
  return result
}
