import type { SubDialOutOfRangeBehavior } from '@/types/elements/subDial'

export function normalizeSubDialValue(
  value: number,
  minValue: number,
  maxValue: number,
  behavior: SubDialOutOfRangeBehavior,
): number | null {
  if (![value, minValue, maxValue].every(Number.isFinite) || maxValue <= minValue) return null
  const progress = (value - minValue) / (maxValue - minValue)
  if (behavior === 'hide' && (progress < 0 || progress > 1)) return null
  return Math.max(0, Math.min(1, progress))
}

export function resolveSubDialAngle(
  progress: number,
  startAngle: number,
  endAngle: number,
  counterClockwise: boolean,
  rotationOffset: number,
): number {
  let sweep = endAngle - startAngle
  if (counterClockwise && sweep > 0) sweep -= 360
  if (!counterClockwise && sweep < 0) sweep += 360
  return startAngle + sweep * progress + rotationOffset
}

export function clampPivot(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.5))
}
