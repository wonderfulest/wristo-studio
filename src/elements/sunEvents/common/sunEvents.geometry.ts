import { timeFractionToArcAngle } from './sunEvents.model'
import type {
  ArcSunEventsElementConfig,
  CurveIndicatorOrientation,
  CurveSunEventsElementConfig,
  LineSunEventsElementConfig,
  SunEventIndicatorBase,
} from '@/types/elements/sunEvents'

export type ArcIndicatorOrientation = 'fixed' | 'inward' | 'outward'

export function resolveSunEventIndicatorSource(indicator: Partial<SunEventIndicatorBase> | undefined): string | undefined {
  return indicator?.imageSvg || indicator?.imageUrl
}

export function scaleArcSunEventsConfig(
  config: ArcSunEventsElementConfig,
  scale: number,
  left: number,
  top: number,
): ArcSunEventsElementConfig {
  const safeScale = Number.isFinite(scale) ? Math.max(0.0001, Math.abs(scale)) : 1
  const scaled = (value: number, minimum = 0) => Math.max(minimum, Math.round(Number(value || 0) * safeScale))
  return {
    ...config,
    left: Math.round(left),
    top: Math.round(top),
    radius: scaled(config.radius, 1),
    strokeWidth: scaled(config.strokeWidth, 1),
    indicator: {
      ...config.indicator,
      width: scaled(config.indicator.width, 1),
      height: scaled(config.indicator.height, 1),
      radialOffset: Math.round(Number(config.indicator.radialOffset || 0) * safeScale),
    },
  }
}

export function scaleLineSunEventsConfig(
  config: LineSunEventsElementConfig,
  scaleX: number,
  scaleY: number,
  left: number,
  top: number,
): LineSunEventsElementConfig {
  const safeScaleX = Number.isFinite(scaleX) ? Math.max(0.0001, Math.abs(scaleX)) : 1
  const safeScaleY = Number.isFinite(scaleY) ? Math.max(0.0001, Math.abs(scaleY)) : 1
  return {
    ...config,
    left: Math.round(left),
    top: Math.round(top),
    length: Math.max(1, Math.round(Number(config.length || 0) * safeScaleX)),
    strokeWidth: Math.max(1, Math.round(Number(config.strokeWidth || 0) * safeScaleY)),
    indicator: {
      ...config.indicator,
      offset: Math.round(Number(config.indicator.offset || 0) * safeScaleY),
    },
  }
}

export function scaleCurveSunEventsConfig(
  config: CurveSunEventsElementConfig,
  scaleX: number,
  scaleY: number,
  left: number,
  top: number,
): CurveSunEventsElementConfig {
  const safeScaleX = Number.isFinite(scaleX) ? Math.max(0.0001, Math.abs(scaleX)) : 1
  const safeScaleY = Number.isFinite(scaleY) ? Math.max(0.0001, Math.abs(scaleY)) : 1
  return {
    ...config,
    left: Math.round(left),
    top: Math.round(top),
    width: Math.max(1, Math.round(Number(config.width || 0) * safeScaleX)),
    height: Math.max(1, Math.round(Number(config.height || 0) * safeScaleY)),
    strokeWidth: Math.max(1, Math.round(Number(config.strokeWidth || 0) * safeScaleY)),
    indicator: {
      ...config.indicator,
      normalOffset: Math.round(Number(config.indicator.normalOffset || 0) * safeScaleY),
    },
  }
}

export type CurvePoint = { x: number; y: number }
export type CurveQuadraticPiece = { start: CurvePoint; control: CurvePoint; end: CurvePoint }

type Quadratic = readonly [CurvePoint, CurvePoint, CurvePoint]

function mixPoint(start: CurvePoint, end: CurvePoint, fraction: number): CurvePoint {
  return {
    x: start.x + (end.x - start.x) * fraction,
    y: start.y + (end.y - start.y) * fraction,
  }
}

function splitQuadratic(curve: Quadratic, fraction: number): [Quadratic, Quadratic] {
  const first = mixPoint(curve[0], curve[1], fraction)
  const second = mixPoint(curve[1], curve[2], fraction)
  const middle = mixPoint(first, second, fraction)
  return [
    [curve[0], first, middle],
    [middle, second, curve[2]],
  ]
}

function sliceQuadratic(curve: Quadratic, start: number, end: number): Quadratic {
  if (start <= 0 && end >= 1) return curve
  const [prefix] = splitQuadratic(curve, end)
  if (start <= 0) return prefix
  const [, slice] = splitQuadratic(prefix, start / end)
  return slice
}

function curveDefinitions(width: number, height: number): Array<{
  startFraction: number
  endFraction: number
  curve: Quadratic
}> {
  return [
    {
      startFraction: 0,
      endFraction: 0.5,
      curve: [
        { x: -width / 2, y: height / 2 },
        { x: -width / 4, y: -height / 2 },
        { x: 0, y: -height / 2 },
      ],
    },
    {
      startFraction: 0.5,
      endFraction: 1,
      curve: [
        { x: 0, y: -height / 2 },
        { x: width / 4, y: -height / 2 },
        { x: width / 2, y: height / 2 },
      ],
    },
  ]
}

function clampFraction(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
}

function roundGeometry(value: number): number {
  const rounded = Math.round(value * 1e6) / 1e6
  return Object.is(rounded, -0) ? 0 : rounded
}

export function curveQuadraticPieces(
  startFraction: number,
  endFraction: number,
  width: number,
  height: number,
): CurveQuadraticPiece[] {
  const start = clampFraction(startFraction)
  const end = clampFraction(endFraction)
  if (end <= start) return []

  const pieces: CurveQuadraticPiece[] = []
  for (const definition of curveDefinitions(width, height)) {
    const pieceStart = Math.max(start, definition.startFraction)
    const pieceEnd = Math.min(end, definition.endFraction)
    if (pieceEnd <= pieceStart) continue
    const span = definition.endFraction - definition.startFraction
    const localStart = (pieceStart - definition.startFraction) / span
    const localEnd = (pieceEnd - definition.startFraction) / span
    const [pieceStartPoint, control, pieceEndPoint] = sliceQuadratic(
      definition.curve,
      localStart,
      localEnd,
    )
    pieces.push({
      start: { x: roundGeometry(pieceStartPoint.x), y: roundGeometry(pieceStartPoint.y) },
      control: { x: roundGeometry(control.x), y: roundGeometry(control.y) },
      end: { x: roundGeometry(pieceEndPoint.x), y: roundGeometry(pieceEndPoint.y) },
    })
  }
  return pieces
}

function evaluateCurve(fraction: number, width: number, height: number): {
  point: CurvePoint
  derivative: CurvePoint
} {
  const clamped = clampFraction(fraction)
  const definition = clamped <= 0.5
    ? curveDefinitions(width, height)[0]
    : curveDefinitions(width, height)[1]
  const localFraction = (clamped - definition.startFraction)
    / (definition.endFraction - definition.startFraction)
  const [start, control, end] = definition.curve
  const remaining = 1 - localFraction
  return {
    point: {
      x: remaining * remaining * start.x
        + 2 * remaining * localFraction * control.x
        + localFraction * localFraction * end.x,
      y: remaining * remaining * start.y
        + 2 * remaining * localFraction * control.y
        + localFraction * localFraction * end.y,
    },
    derivative: {
      x: 2 * remaining * (control.x - start.x) + 2 * localFraction * (end.x - control.x),
      y: 2 * remaining * (control.y - start.y) + 2 * localFraction * (end.y - control.y),
    },
  }
}

export function curveIndicatorTransform(input: {
  fraction: number
  width: number
  height: number
  normalOffset: number
  orientation: CurveIndicatorOrientation
}): { x: number; y: number; angle: number } {
  const { point, derivative } = evaluateCurve(input.fraction, input.width, input.height)
  const length = Math.hypot(derivative.x, derivative.y) || 1
  const offset = Number(input.normalOffset || 0)
  const angle = input.orientation === 'tangent'
    ? Math.atan2(derivative.y, derivative.x) * 180 / Math.PI
    : 0
  return {
    x: roundGeometry(point.x + derivative.y / length * offset),
    y: roundGeometry(point.y - derivative.x / length * offset),
    angle: roundGeometry(angle),
  }
}

export function arcIndicatorTransform(input: {
  fraction: number
  centerX: number
  centerY: number
  radius: number
  radialOffset: number
  startAngle: number
  angleRange: number
  counterClockwise: boolean
  orientation: ArcIndicatorOrientation
}): { x: number; y: number; angle: number } {
  const angle = timeFractionToArcAngle(input.fraction, input.startAngle, input.angleRange, input.counterClockwise)
  const radians = angle * Math.PI / 180
  const distance = input.radius + input.radialOffset
  const orientation = input.orientation === 'fixed'
    ? 0
    : input.orientation === 'outward'
      ? ((angle + 90) % 360 + 360) % 360
      : ((angle - 90) % 360 + 360) % 360
  return {
    x: Math.round((input.centerX + Math.cos(radians) * distance) * 1e6) / 1e6,
    y: Math.round((input.centerY + Math.sin(radians) * distance) * 1e6) / 1e6,
    angle: orientation,
  }
}

export function lineIndicatorTransform(input: { fraction: number; length: number; offset: number }): { x: number; y: number } {
  const fraction = Math.max(0, Math.min(1, input.fraction))
  return { x: -input.length / 2 + input.length * fraction, y: input.offset }
}
