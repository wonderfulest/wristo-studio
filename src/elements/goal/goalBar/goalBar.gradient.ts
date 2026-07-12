import { Gradient } from 'fabric'
import type { GoalBarProgressDirection } from './goalBar.direction'

type GoalBarGradientInput = {
  enabled: boolean
  startColor?: string
  endColor?: string
  progressDirection?: GoalBarProgressDirection
  progressAlign?: 'left' | 'right'
  width: number
  height?: number
  startRatio?: number
  endRatio?: number
}

export type GoalBarGradientSpec = {
  coords: { x1: number; y1: number; x2: number; y2: number }
  colorStops: Array<{ offset: number; color: string }>
}

function normalizeGradientColor(value: unknown): string | null {
  const raw = String(value ?? '').trim()
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase()
  if (/^0x[0-9a-f]{6}$/i.test(raw)) return `#${raw.slice(2).toUpperCase()}`
  return null
}

function interpolateColor(start: string, end: string, ratio: number): string {
  const t = Math.max(0, Math.min(1, ratio))
  const startValue = Number.parseInt(start.slice(1), 16)
  const endValue = Number.parseInt(end.slice(1), 16)
  const channel = (shift: number) => Math.round(
    ((startValue >> shift) & 0xff) + (((endValue >> shift) & 0xff) - ((startValue >> shift) & 0xff)) * t,
  )
  return `#${[channel(16), channel(8), channel(0)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}

export function createGoalBarGradientSpec(input: GoalBarGradientInput): GoalBarGradientSpec | null {
  if (!input.enabled || input.width <= 0) return null
  const start = normalizeGradientColor(input.startColor)
  const end = normalizeGradientColor(input.endColor)
  if (!start || !end) return null

  const startRatio = Math.max(0, Math.min(1, input.startRatio ?? 0))
  const endRatio = Math.max(startRatio, Math.min(1, input.endRatio ?? 1))
  const direction = input.progressDirection ?? (input.progressAlign === 'right' ? 'rightToLeft' : 'leftToRight')
  const height = input.height ?? 0
  const coords = {
    leftToRight: { x1: 0, y1: 0, x2: input.width, y2: 0 },
    rightToLeft: { x1: input.width, y1: 0, x2: 0, y2: 0 },
    topToBottom: { x1: 0, y1: 0, x2: 0, y2: height },
    bottomToTop: { x1: 0, y1: height, x2: 0, y2: 0 },
  }[direction]
  return {
    coords,
    colorStops: [
      { offset: 0, color: interpolateColor(start, end, startRatio) },
      { offset: 1, color: interpolateColor(start, end, endRatio) },
    ],
  }
}

export function createGoalBarGradientFill(input: GoalBarGradientInput): Gradient<'linear'> | null {
  const spec = createGoalBarGradientSpec(input)
  if (!spec) return null
  return new Gradient<'linear'>({
    type: 'linear',
    gradientUnits: 'pixels',
    coords: spec.coords,
    colorStops: spec.colorStops,
  })
}
