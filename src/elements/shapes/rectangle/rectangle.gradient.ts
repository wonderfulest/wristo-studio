import { Gradient } from 'fabric'
import type { RectangleGradientDirection } from '@/types/elements/shape'

const DIRECTIONS: RectangleGradientDirection[] = [
  'leftToRight',
  'rightToLeft',
  'topToBottom',
  'bottomToTop',
]

export type RectangleGradientInput = {
  enabled: boolean
  startColor?: string
  endColor?: string
  direction?: RectangleGradientDirection
  width: number
  height: number
}

export type RectangleGradientSpec = {
  coords: { x1: number; y1: number; x2: number; y2: number }
  colorStops: Array<{ offset: number; color: string }>
}

export function normalizeRectangleGradientDirection(value: unknown): RectangleGradientDirection {
  return DIRECTIONS.includes(value as RectangleGradientDirection)
    ? value as RectangleGradientDirection
    : 'leftToRight'
}

function normalizeColor(value: unknown): string | null {
  const color = String(value ?? '').trim()
  if (/^#[0-9a-f]{6}$/i.test(color)) return color
  if (/^0x[0-9a-f]{6}$/i.test(color)) return `#${color.slice(2)}`
  return null
}

export function createRectangleGradientSpec(input: RectangleGradientInput): RectangleGradientSpec | null {
  if (!input.enabled || input.width <= 0 || input.height <= 0) return null
  const startColor = normalizeColor(input.startColor)
  const endColor = normalizeColor(input.endColor)
  if (!startColor || !endColor) return null

  const direction = normalizeRectangleGradientDirection(input.direction)
  const coords = direction === 'rightToLeft'
    ? { x1: input.width, y1: 0, x2: 0, y2: 0 }
    : direction === 'topToBottom'
      ? { x1: 0, y1: 0, x2: 0, y2: input.height }
      : direction === 'bottomToTop'
        ? { x1: 0, y1: input.height, x2: 0, y2: 0 }
        : { x1: 0, y1: 0, x2: input.width, y2: 0 }

  return {
    coords,
    colorStops: [
      { offset: 0, color: startColor },
      { offset: 1, color: endColor },
    ],
  }
}

export function createRectangleGradientFill(input: RectangleGradientInput): Gradient<'linear'> | null {
  const spec = createRectangleGradientSpec(input)
  if (!spec) return null
  return new Gradient<'linear'>({
    type: 'linear',
    gradientUnits: 'pixels',
    coords: spec.coords,
    colorStops: spec.colorStops,
  })
}
