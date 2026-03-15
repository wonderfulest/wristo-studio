import type { FabricElement } from '@/types/element'
import type { GoalArcElementConfig } from '@/types/elements/goal'
import { ensureGoalElementId } from '@/elements/goal/goal.common'

export function encodeGoalArc(element: Partial<FabricElement>): GoalArcElementConfig {
  if (!element) {
    throw new Error('Invalid element')
  }

  const anyElement = element as any
  const mainRing: any = anyElement.getObjects?.().find((obj: any) => (obj as any).id.endsWith('_main'))
  const bgRing: any = anyElement.getObjects?.().find((obj: any) => (obj as any).id.endsWith('_bg'))

  if (!mainRing || !bgRing) {
    throw new Error('Invalid element')
  }

  const id = ensureGoalElementId(anyElement.id as string | undefined)

  const config: GoalArcElementConfig = {
    id: id,
    eleType: 'goalArc',
    left: Math.round((anyElement.left ?? 0) as number),
    top: Math.round((anyElement.top ?? 0) as number),
    originX: (anyElement.originX ?? 'center') as any,
    originY: (anyElement.originY ?? 'center') as any,
    startAngle: Number(anyElement.startAngle ?? mainRing.startAngle ?? 0),
    endAngle: Number(anyElement.endAngle ?? mainRing.endAngle ?? 0),
    radius: Number(mainRing.radius ?? 0),
    bgRadius: Number(bgRing.radius ?? 0),
    strokeWidth: Number(mainRing.strokeWidth ?? 0),
    bgStrokeWidth: Number(bgRing.strokeWidth ?? 0),
    color: mainRing.stroke as string,
    bgColor: bgRing.stroke as string,
    counterClockwise: Boolean(anyElement.counterClockwise ?? mainRing.counterClockwise ?? false),
    goalProperty: String(anyElement.goalProperty ?? ''),
    // 进度值目前仍由业务层维护，缺省时按 0 处理
    progress: Number((anyElement.progress ?? 0) as number),
  }

  return config
}

export function decodeGoalArc(config: GoalArcElementConfig): Partial<FabricElement> {
  const decoded: Partial<FabricElement> = {
    eleType: 'goalArc',
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    startAngle: config.startAngle,
    endAngle: config.endAngle,
    // 这些值主要用于 renderer 在创建时计算半径与描边
    radius: config.radius,
    bgRadius: config.bgRadius,
    strokeWidth: config.strokeWidth,
    bgStrokeWidth: config.bgStrokeWidth,
    color: config.color,
    bgColor: config.bgColor,
    counterClockwise: config.counterClockwise,
    goalProperty: config.goalProperty,
    progress: config.progress,
  }

  return decoded
}
