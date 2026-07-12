export const GOAL_BAR_DIRECTIONS = [
  'leftToRight',
  'rightToLeft',
  'bottomToTop',
  'topToBottom',
] as const

export type GoalBarProgressDirection = typeof GOAL_BAR_DIRECTIONS[number]
export type GoalBarAxis = 'horizontal' | 'vertical'

export function normalizeGoalBarDirection(value: unknown, legacyAlign?: unknown): GoalBarProgressDirection {
  if (GOAL_BAR_DIRECTIONS.includes(value as GoalBarProgressDirection)) {
    return value as GoalBarProgressDirection
  }
  if (value === undefined || value === null || value === '') {
    return legacyAlign === 'right' ? 'rightToLeft' : 'leftToRight'
  }
  return 'leftToRight'
}

export function resolveGoalBarDirection(direction: GoalBarProgressDirection): {
  direction: GoalBarProgressDirection
  axis: GoalBarAxis
  reversed: boolean
} {
  return {
    direction,
    axis: direction === 'leftToRight' || direction === 'rightToLeft' ? 'horizontal' : 'vertical',
    reversed: direction === 'rightToLeft' || direction === 'bottomToTop',
  }
}

export function getGoalBarProgressBounds(
  width: number,
  height: number,
  progress: number,
  direction: GoalBarProgressDirection,
) {
  const ratio = Math.max(0, Math.min(1, Number(progress) || 0))
  switch (direction) {
    case 'rightToLeft':
      return { left: width * (1 - ratio), top: 0, width: width * ratio, height }
    case 'topToBottom':
      return { left: 0, top: 0, width, height: height * ratio }
    case 'bottomToTop':
      return { left: 0, top: height * (1 - ratio), width, height: height * ratio }
    default:
      return { left: 0, top: 0, width: width * ratio, height }
  }
}
