import type { FabricElement } from '@/types/element'
import type { GoalBarElementConfig } from '@/types/elements/goal'
import { ensureGoalElementId } from '../goal.common'
import { normalizeGoalBarPolygonConfig } from './goalBar.geometry'
import { normalizeGoalBarDirection, resolveGoalBarOrientation } from './goalBar.direction'

type LegacyGoalBarPolygonConfig = {
  shape?: unknown
  polygonPoints?: unknown
  slantRatio?: unknown
}

type LegacyGoalBarDirectionConfig = {
  progressDirection?: unknown
  progressAlign?: unknown
}

const INVALID_POLYGON_WARNING = '[GoalBar] Invalid polygonPoints; falling back to rectangle'

function normalizePersistedPolygonConfig(input: LegacyGoalBarPolygonConfig, id: unknown) {
  const normalized = normalizeGoalBarPolygonConfig(input)
  if (input.shape === 'customPolygon' && normalized.shape === 'rectangle') {
    console.warn(INVALID_POLYGON_WARNING, { id })
  }
  return normalized
}

export function encodeGoalBar(element: Partial<FabricElement>): GoalBarElementConfig {
  if (!element) {
    throw new Error('Invalid element')
  }

  const anyElement = element as any
  const objects = anyElement.getObjects?.() ?? []
  const background: any = objects.find((obj: any) => (obj as any).id?.endsWith?.('_background'))

  // Widget config 提供持久化回退；可能分叉的 live 字段在下方按字段优先读取。
  const widget = anyElement.__element as { config?: Partial<GoalBarElementConfig> } | undefined
  const config = (widget?.config ?? {}) as Partial<GoalBarElementConfig> & LegacyGoalBarPolygonConfig & LegacyGoalBarDirectionConfig

  const id = ensureGoalElementId(anyElement.id as string | undefined)
  const polygonConfig = normalizePersistedPolygonConfig(
    {
      shape: anyElement.shape ?? config.shape,
      polygonPoints: anyElement.polygonPoints ?? config.polygonPoints,
      slantRatio: anyElement.slantRatio ?? config.slantRatio
    },
    id
  )
  const progressDirection = normalizeGoalBarDirection(
    anyElement.progressDirection ?? config.progressDirection,
    anyElement.progressAlign ?? config.progressAlign,
  )
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
    goalProperty: anyElement.goalProperty ?? config.goalProperty,
    orientation: resolveGoalBarOrientation(progressDirection),
    progressDirection,
    shape: polygonConfig.shape,
    polygonPoints: polygonConfig.polygonPoints,
    gradientEnabled: Boolean(anyElement.gradientEnabled ?? config.gradientEnabled ?? false),
    gradientStartColor: anyElement.gradientStartColor ?? config.gradientStartColor ?? anyElement.color ?? config.color,
    gradientEndColor: anyElement.gradientEndColor ?? config.gradientEndColor ?? anyElement.color ?? config.color
  }

  return result as GoalBarElementConfig
}

export function decodeGoalBar(config: GoalBarElementConfig): Partial<FabricElement> {
  const legacyConfig = config as unknown as LegacyGoalBarPolygonConfig & LegacyGoalBarDirectionConfig
  const polygonConfig = normalizePersistedPolygonConfig(legacyConfig, config.id)
  const progressDirection = normalizeGoalBarDirection(legacyConfig.progressDirection, legacyConfig.progressAlign)
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
    orientation: resolveGoalBarOrientation(progressDirection),
    progressDirection,
    shape: polygonConfig.shape,
    polygonPoints: polygonConfig.polygonPoints,
    gradientEnabled: Boolean(config.gradientEnabled ?? false),
    gradientStartColor: config.gradientStartColor ?? config.color,
    gradientEndColor: config.gradientEndColor ?? config.color
  }

  return result
}
