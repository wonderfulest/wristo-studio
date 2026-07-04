import type { FabricElement } from '@/types/element'
import type { GoalArcElementConfig } from '@/types/elements/goal'
import { ensureGoalElementId } from '@/elements/goal/goal.common'

const GOAL_ARC_ENCODER_DEBUG = false
const normalizeEndCap = (value: unknown): 'round' | 'butt' => value === 'round' ? 'round' : 'butt'

export function encodeGoalArc(element: Partial<FabricElement>): GoalArcElementConfig {
  if (!element) {
    throw new Error('Invalid element')
  }

  const anyElement = element as any
  const widgetConfig = anyElement.__element?.config as Partial<GoalArcElementConfig> | undefined
  const mainRing: any = anyElement.getObjects?.().find((obj: any) => String((obj as any).id ?? '').endsWith('_main'))
  const bgRing: any = anyElement.getObjects?.().find((obj: any) => String((obj as any).id ?? '').endsWith('_bg'))

  if (!widgetConfig && (!mainRing || !bgRing)) {
    throw new Error('Invalid element')
  }

  const id = ensureGoalElementId(anyElement.id as string | undefined)

  const config: GoalArcElementConfig = {
    id: id,
    eleType: 'goalArc',
    left: Math.round(Number(anyElement.left ?? widgetConfig?.left ?? 0)),
    top: Math.round(Number(anyElement.top ?? widgetConfig?.top ?? 0)),
    originX: (anyElement.originX ?? 'center') as any,
    originY: (anyElement.originY ?? 'center') as any,
    startAngle: Number(anyElement.startAngle ?? widgetConfig?.startAngle ?? mainRing?.startAngle ?? 0),
    endAngle: Number(anyElement.endAngle ?? widgetConfig?.endAngle ?? mainRing?.endAngle ?? 0),
    radius: Number(widgetConfig?.radius ?? mainRing?.radius ?? 0),
    bgRadius: Number(widgetConfig?.bgRadius ?? bgRing?.radius ?? widgetConfig?.radius ?? 0),
    strokeWidth: Number(widgetConfig?.strokeWidth ?? mainRing?.strokeWidth ?? 0),
    bgStrokeWidth: Number(widgetConfig?.bgStrokeWidth ?? bgRing?.strokeWidth ?? widgetConfig?.strokeWidth ?? 0),
    color: String(widgetConfig?.color ?? mainRing?.stroke ?? '#FFFFFF'),
    bgColor: String(widgetConfig?.bgColor ?? bgRing?.stroke ?? '#555555'),
    counterClockwise: Boolean(anyElement.counterClockwise ?? widgetConfig?.counterClockwise ?? mainRing?.counterClockwise ?? false),
    goalProperty: String(anyElement.goalProperty ?? ''),
    // 进度值目前仍由业务层维护，缺省时按 0 处理
    progress: Number((anyElement.progress ?? 0) as number),
    segmentMode: Boolean(anyElement.segmentMode ?? widgetConfig?.segmentMode ?? false),
    segments: Number(anyElement.segments ?? widgetConfig?.segments ?? 12),
    gapAngle: Number(anyElement.gapAngle ?? widgetConfig?.gapAngle ?? 2),
    endCap: normalizeEndCap(anyElement.endCap ?? widgetConfig?.endCap),
  }

  if (GOAL_ARC_ENCODER_DEBUG) {
    console.groupCollapsed('[goalArc] encode')
    console.log('element', {
      id: anyElement.id,
      left: anyElement.left,
      top: anyElement.top,
      width: anyElement.width,
      height: anyElement.height,
      scaleX: anyElement.scaleX,
      scaleY: anyElement.scaleY,
      segmentMode: anyElement.segmentMode,
      segments: anyElement.segments,
      gapAngle: anyElement.gapAngle,
      objectCount: anyElement.getObjects?.().length,
    })
    console.log('widgetConfig', widgetConfig)
    console.log('encodedConfig', config)
    console.groupEnd()
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
    segmentMode: config.segmentMode,
    segments: config.segments,
    gapAngle: config.gapAngle,
    endCap: normalizeEndCap(config.endCap),
  }

  if (GOAL_ARC_ENCODER_DEBUG) {
    console.groupCollapsed('[goalArc] decode')
    console.log('inputConfig', config)
    console.log('decoded', decoded)
    console.groupEnd()
  }

  return decoded
}
