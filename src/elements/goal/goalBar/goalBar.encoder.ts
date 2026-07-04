import type { FabricElement } from '@/types/element'
import type { GoalBarElementConfig } from '@/types/elements/goal'
import { ensureGoalElementId } from '../goal.common'

export function encodeGoalBar(element: Partial<FabricElement>): GoalBarElementConfig {
  if (!element) {
    throw new Error('Invalid element')
  }

  const anyElement = element as any
  const objects = anyElement.getObjects?.() ?? []
  const background: any = objects.find((obj: any) => (obj as any).id?.endsWith?.('_background'))

  // 优先从 widget config 读取（如果存在 __element.config）
  const widget = anyElement.__element as { config?: Partial<GoalBarElementConfig> } | undefined
  const config = (widget?.config ?? {}) as Partial<GoalBarElementConfig>

  const id = ensureGoalElementId(anyElement.id as string | undefined)
  const result: Partial<GoalBarElementConfig> = {
    id,
    eleType: 'goalBar',
    left: anyElement.left ?? config.left,
    top: anyElement.top ?? config.top,
    width: config.width ?? background?.width,
    height: config.height ?? background?.height,
    color: config.color ?? anyElement.color,
    bgColor: config.bgColor ?? anyElement.bgColor,
    variant: config.variant ?? anyElement.variant ?? 'continuous',
    segments: config.segments ?? anyElement.segments,
    gap: config.gap ?? anyElement.gap,
    borderRadius: config.borderRadius ?? anyElement.borderRadius,
    progress: config.progress ?? anyElement.progress,
    padding: config.padding ?? anyElement.padding,
    originX: 'center' as any,
    originY: 'center' as any,
    borderWidth: config.borderWidth ?? anyElement.borderWidth,
    borderColor: config.borderColor ?? anyElement.borderColor,
    goalProperty: config.goalProperty ?? anyElement.goalProperty,
    progressAlign: config.progressAlign ?? anyElement.progressAlign,
  }

  return result as GoalBarElementConfig
}

export function decodeGoalBar(config: GoalBarElementConfig): Partial<FabricElement> {
  const result: Partial<FabricElement> = {
    id: config.id,
    eleType: 'goalBar',
    left: config.left,
    top: config.top,
    width: config.width,
    height: config.height,
    color: config.color,
    bgColor: config.bgColor,
    variant: config.variant,
    segments: config.segments,
    gap: config.gap,
    borderRadius: config.borderRadius,
    progress: config.progress,
    padding: config.padding,
    originX: 'center' as any,
    originY: 'center' as any,
    borderWidth: config.borderWidth,
    borderColor: config.borderColor,
    goalProperty: config.goalProperty,
    progressAlign: config.progressAlign,
  }

  return result
}
