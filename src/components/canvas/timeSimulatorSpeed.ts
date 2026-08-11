export const TIME_SIMULATOR_SPEEDS = [1, 2, 5, 10, 30, 60, 120, 300, 600, 1000] as const

export function getSpeedAtSliderIndex(index: number): number {
  const safeIndex = Number.isFinite(index)
    ? Math.min(TIME_SIMULATOR_SPEEDS.length - 1, Math.max(0, Math.round(index)))
    : 0
  return TIME_SIMULATOR_SPEEDS[safeIndex]
}

export function getSliderIndexForSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 0

  return TIME_SIMULATOR_SPEEDS.reduce((nearestIndex, candidate, index) => {
    const nearestDistance = Math.abs(TIME_SIMULATOR_SPEEDS[nearestIndex] - speed)
    const candidateDistance = Math.abs(candidate - speed)
    return candidateDistance < nearestDistance ? index : nearestIndex
  }, 0)
}
