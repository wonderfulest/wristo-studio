export type RotatingHandOutOfRangeBehavior = 'clamp' | 'hide'

export interface RotatingHandAngleConfig {
  startAngle: number
  endAngle: number
  counterClockwise: boolean
  outOfRangeBehavior: RotatingHandOutOfRangeBehavior
}

export interface RotatingHandDirectionConfig {
  northAngle: number
  counterClockwise: boolean
}

const normalizeAngle = (angle: number): number => {
  const normalized = angle % 360
  return normalized < 0 ? normalized + 360 : normalized
}

export function toRotatingHandRenderAngle(configuredAngle: number): number {
  return normalizeAngle(Number(configuredAngle) + 90)
}

export function resolveRotatingHandDirectionAngle(
  bearing: number,
  config: RotatingHandDirectionConfig,
): number | null {
  if (!Number.isFinite(bearing)) return null
  const direction = config.counterClockwise ? -1 : 1
  return normalizeAngle(Number(config.northAngle) + bearing * direction)
}

export function resolveRotatingHandAngle(
  progress: number,
  config: RotatingHandAngleConfig,
): number | null {
  if (!Number.isFinite(progress)) return null

  if (config.outOfRangeBehavior === 'hide' && (progress < 0 || progress > 1)) {
    return null
  }

  const normalizedProgress = Math.min(1, Math.max(0, progress))
  const sweep = Math.abs(Number(config.endAngle) - Number(config.startAngle))
  const direction = config.counterClockwise ? -1 : 1
  return Number(config.startAngle) + normalizedProgress * sweep * direction
}
