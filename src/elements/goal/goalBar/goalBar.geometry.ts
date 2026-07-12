export type GoalBarShape = 'rectangle' | 'customPolygon'
import type { GoalBarProgressDirection } from './goalBar.direction'
import { resolveGoalBarDirection } from './goalBar.direction'
export type GoalBarLegacyShape = 'trapezoid' | 'reverseTrapezoid' | 'parallelogram'
export type GoalBarPolygonPoint = { x: number; y: number }
export type GoalBarPolygonBounds = { left: number; top: number; width: number; height: number }
export type PolygonValidationReason = 'pointCount' | 'range' | 'duplicate' | 'selfIntersection' | 'concave' | 'area'

export const MIN_POLYGON_POINTS = 3
export const MAX_POLYGON_POINTS = 8
export const MIN_NORMALIZED_POLYGON_AREA = 0.001
export const POLYGON_EPSILON = 0.000001

export const DEFAULT_GOAL_BAR_SHAPE: GoalBarShape = 'rectangle'
export const DEFAULT_GOAL_BAR_SLANT_RATIO = 0.2
export const MAX_GOAL_BAR_SLANT_RATIO = 0.45

// Compatibility aliases/helpers are retained while callers migrate from the legacy presets.
export type GoalBarPoint = GoalBarPolygonPoint
export type GoalBarRenderableShape = GoalBarShape | GoalBarLegacyShape

const GOAL_BAR_SHAPES: GoalBarRenderableShape[] = ['rectangle', 'customPolygon', 'trapezoid', 'reverseTrapezoid', 'parallelogram']

const LEGACY_GOAL_BAR_SHAPES: GoalBarLegacyShape[] = ['trapezoid', 'reverseTrapezoid', 'parallelogram']

function isGoalBarPolygonPoint(value: unknown): value is GoalBarPolygonPoint {
  if (typeof value !== 'object' || value === null) return false
  const point = value as Record<string, unknown>
  return typeof point.x === 'number' && typeof point.y === 'number'
}

function arePointsEqual(a: GoalBarPolygonPoint, b: GoalBarPolygonPoint): boolean {
  return Math.abs(a.x - b.x) <= POLYGON_EPSILON && Math.abs(a.y - b.y) <= POLYGON_EPSILON
}

function crossProduct(a: GoalBarPolygonPoint, b: GoalBarPolygonPoint, c: GoalBarPolygonPoint): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function orientation(a: GoalBarPolygonPoint, b: GoalBarPolygonPoint, c: GoalBarPolygonPoint): -1 | 0 | 1 {
  const cross = crossProduct(a, b, c)
  if (Math.abs(cross) <= POLYGON_EPSILON) return 0
  return cross > 0 ? 1 : -1
}

function isPointOnSegment(point: GoalBarPolygonPoint, start: GoalBarPolygonPoint, end: GoalBarPolygonPoint): boolean {
  return (
    point.x >= Math.min(start.x, end.x) - POLYGON_EPSILON &&
    point.x <= Math.max(start.x, end.x) + POLYGON_EPSILON &&
    point.y >= Math.min(start.y, end.y) - POLYGON_EPSILON &&
    point.y <= Math.max(start.y, end.y) + POLYGON_EPSILON
  )
}

function segmentsIntersect(firstStart: GoalBarPolygonPoint, firstEnd: GoalBarPolygonPoint, secondStart: GoalBarPolygonPoint, secondEnd: GoalBarPolygonPoint): boolean {
  const firstStartOrientation = orientation(firstStart, firstEnd, secondStart)
  const firstEndOrientation = orientation(firstStart, firstEnd, secondEnd)
  const secondStartOrientation = orientation(secondStart, secondEnd, firstStart)
  const secondEndOrientation = orientation(secondStart, secondEnd, firstEnd)

  if (firstStartOrientation * firstEndOrientation < 0 && secondStartOrientation * secondEndOrientation < 0) {
    return true
  }

  return (
    (firstStartOrientation === 0 && isPointOnSegment(secondStart, firstStart, firstEnd)) ||
    (firstEndOrientation === 0 && isPointOnSegment(secondEnd, firstStart, firstEnd)) ||
    (secondStartOrientation === 0 && isPointOnSegment(firstStart, secondStart, secondEnd)) ||
    (secondEndOrientation === 0 && isPointOnSegment(firstEnd, secondStart, secondEnd))
  )
}

function polygonArea(points: GoalBarPolygonPoint[]): number {
  let twiceSignedArea = 0
  for (let index = 0; index < points.length; index++) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    twiceSignedArea += current.x * next.y - next.x * current.y
  }
  return Math.abs(twiceSignedArea) / 2
}

function isLegacyGoalBarShape(value: unknown): value is GoalBarLegacyShape {
  return LEGACY_GOAL_BAR_SHAPES.includes(value as GoalBarLegacyShape)
}

function copyValidPolygonPoints(value: unknown): GoalBarPolygonPoint[] {
  if (!Array.isArray(value) || !value.every(isGoalBarPolygonPoint)) return []
  const points = value.map((point) => ({ x: point.x, y: point.y }))
  return validateGoalBarPolygon(points).valid ? points : []
}

export function validateGoalBarPolygon(points: GoalBarPolygonPoint[]): { valid: true } | { valid: false; reason: PolygonValidationReason } {
  if (!Array.isArray(points) || points.length < MIN_POLYGON_POINTS || points.length > MAX_POLYGON_POINTS) {
    return { valid: false, reason: 'pointCount' }
  }

  if (!points.every(isGoalBarPolygonPoint) || points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    return { valid: false, reason: 'range' }
  }

  if (points.some((point) => point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1)) {
    return { valid: false, reason: 'range' }
  }

  for (let firstIndex = 0; firstIndex < points.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < points.length; secondIndex++) {
      if (arePointsEqual(points[firstIndex], points[secondIndex])) {
        return { valid: false, reason: 'duplicate' }
      }
    }
  }

  for (let firstEdgeIndex = 0; firstEdgeIndex < points.length; firstEdgeIndex++) {
    const firstEdgeEndIndex = (firstEdgeIndex + 1) % points.length
    for (let secondEdgeIndex = firstEdgeIndex + 1; secondEdgeIndex < points.length; secondEdgeIndex++) {
      const secondEdgeEndIndex = (secondEdgeIndex + 1) % points.length
      const edgesAreAdjacent = firstEdgeEndIndex === secondEdgeIndex || secondEdgeEndIndex === firstEdgeIndex
      if (edgesAreAdjacent) continue

      if (segmentsIntersect(points[firstEdgeIndex], points[firstEdgeEndIndex], points[secondEdgeIndex], points[secondEdgeEndIndex])) {
        return { valid: false, reason: 'selfIntersection' }
      }
    }
  }

  if (polygonArea(points) <= MIN_NORMALIZED_POLYGON_AREA) {
    return { valid: false, reason: 'area' }
  }

  let windingDirection = 0
  for (let index = 0; index < points.length; index++) {
    const cross = crossProduct(points[index], points[(index + 1) % points.length], points[(index + 2) % points.length])
    if (Math.abs(cross) <= POLYGON_EPSILON) continue

    const direction = Math.sign(cross)
    if (windingDirection === 0) {
      windingDirection = direction
    } else if (direction !== windingDirection) {
      return { valid: false, reason: 'concave' }
    }
  }

  return { valid: true }
}

export function normalizePolygonPoints(points: GoalBarPolygonPoint[]): { points: GoalBarPolygonPoint[]; bounds: GoalBarPolygonBounds } {
  if (points.length === 0) {
    return {
      points: [],
      bounds: { left: 0, top: 0, width: 0, height: 0 }
    }
  }

  const left = Math.min(...points.map((point) => point.x))
  const right = Math.max(...points.map((point) => point.x))
  const top = Math.min(...points.map((point) => point.y))
  const bottom = Math.max(...points.map((point) => point.y))
  const width = right - left
  const height = bottom - top

  return {
    points: points.map((point) => ({
      x: width > POLYGON_EPSILON ? (point.x - left) / width : 0,
      y: height > POLYGON_EPSILON ? (point.y - top) / height : 0
    })),
    bounds: { left, top, width, height }
  }
}

export function denormalizePolygonPoints(points: GoalBarPolygonPoint[], bounds: GoalBarPolygonBounds): GoalBarPolygonPoint[] {
  return points.map((point) => ({
    x: bounds.left + point.x * bounds.width,
    y: bounds.top + point.y * bounds.height
  }))
}

export function insertPointOnEdge(points: GoalBarPolygonPoint[], edgeIndex: number, point: GoalBarPolygonPoint): GoalBarPolygonPoint[] {
  if (points.length === 0) return [{ ...point }]

  const integerEdgeIndex = Number.isFinite(edgeIndex) ? Math.trunc(edgeIndex) : 0
  const normalizedEdgeIndex = ((integerEdgeIndex % points.length) + points.length) % points.length
  const result = points.map((current) => ({ ...current }))
  result.splice(normalizedEdgeIndex + 1, 0, { ...point })
  return result
}

export function migrateLegacyGoalBarPolygon(shape: GoalBarLegacyShape, slantRatio?: number): { shape: 'customPolygon'; polygonPoints: GoalBarPolygonPoint[] } {
  const slant = normalizeGoalBarSlantRatio(slantRatio)
  let polygonPoints: GoalBarPolygonPoint[]

  switch (shape) {
    case 'trapezoid':
      polygonPoints = [
        { x: 0, y: 0 },
        { x: 1 - slant, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ]
      break
    case 'reverseTrapezoid':
      polygonPoints = [
        { x: slant, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ]
      break
    case 'parallelogram':
      polygonPoints = [
        { x: slant, y: 0 },
        { x: 1, y: 0 },
        { x: 1 - slant, y: 1 },
        { x: 0, y: 1 }
      ]
      break
  }

  return { shape: 'customPolygon', polygonPoints }
}

export function normalizeGoalBarPolygonConfig(input: { shape?: unknown; polygonPoints?: unknown; slantRatio?: unknown }): { shape: GoalBarShape; polygonPoints: GoalBarPolygonPoint[] } {
  if (isLegacyGoalBarShape(input.shape)) {
    return migrateLegacyGoalBarPolygon(input.shape, normalizeGoalBarSlantRatio(input.slantRatio))
  }

  const polygonPoints = copyValidPolygonPoints(input.polygonPoints)
  if (input.shape === 'customPolygon') {
    return polygonPoints.length > 0 ? { shape: 'customPolygon', polygonPoints } : { shape: 'rectangle', polygonPoints: [] }
  }

  return { shape: 'rectangle', polygonPoints }
}

export function normalizeGoalBarShape<T extends GoalBarRenderableShape | null | undefined>(value: T): Exclude<T, null | undefined> | 'rectangle'
export function normalizeGoalBarShape(value: unknown): GoalBarRenderableShape
export function normalizeGoalBarShape(value: unknown): GoalBarRenderableShape {
  return GOAL_BAR_SHAPES.includes(value as GoalBarRenderableShape) ? (value as GoalBarRenderableShape) : DEFAULT_GOAL_BAR_SHAPE
}

export function normalizeGoalBarSlantRatio(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return DEFAULT_GOAL_BAR_SLANT_RATIO
  }
  const ratio = Number(value)
  if (!Number.isFinite(ratio)) return DEFAULT_GOAL_BAR_SLANT_RATIO
  return Math.max(0, Math.min(MAX_GOAL_BAR_SLANT_RATIO, ratio))
}

export function createGoalBarPolygonPoints(left: number, top: number, width: number, height: number, shape: GoalBarRenderableShape, slantRatio: number): GoalBarPolygonPoint[] {
  const right = left + Math.max(0, width)
  const bottom = top + Math.max(0, height)
  const slant = Math.max(0, width) * normalizeGoalBarSlantRatio(slantRatio)

  switch (normalizeGoalBarShape(shape)) {
    case 'trapezoid':
      return [
        { x: left, y: top },
        { x: right - slant, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom }
      ]
    case 'reverseTrapezoid':
      return [
        { x: left + slant, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom }
      ]
    case 'parallelogram':
      return [
        { x: left + slant, y: top },
        { x: right, y: top },
        { x: right - slant, y: bottom },
        { x: left, y: bottom }
      ]
    default:
      return [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom }
      ]
  }
}

function intersectVerticalEdge(a: GoalBarPolygonPoint, b: GoalBarPolygonPoint, x: number): GoalBarPolygonPoint {
  const deltaX = b.x - a.x
  if (Math.abs(deltaX) < POLYGON_EPSILON) return { x, y: a.y }
  const ratio = (x - a.x) / deltaX
  return { x, y: a.y + (b.y - a.y) * ratio }
}

function intersectHorizontalEdge(a: GoalBarPolygonPoint, b: GoalBarPolygonPoint, y: number): GoalBarPolygonPoint {
  const deltaY = b.y - a.y
  if (Math.abs(deltaY) < POLYGON_EPSILON) return { x: a.x, y }
  const ratio = (y - a.y) / deltaY
  return { x: a.x + (b.x - a.x) * ratio, y }
}

function deduplicatePoints(points: GoalBarPolygonPoint[]): GoalBarPolygonPoint[] {
  return points.filter((point, index) => {
    const previous = points[(index + points.length - 1) % points.length]
    return !arePointsEqual(point, previous)
  })
}

export function clipGoalBarPolygon(points: GoalBarPolygonPoint[], progress: number, direction: GoalBarProgressDirection): GoalBarPolygonPoint[]
export function clipGoalBarPolygon(points: GoalBarPolygonPoint[], left: number, right: number, progress: number, align: 'left' | 'right'): GoalBarPolygonPoint[]
export function clipGoalBarPolygon(
  points: GoalBarPolygonPoint[],
  progressOrLeft: number,
  directionOrRight: GoalBarProgressDirection | number,
  legacyProgress?: number,
  legacyAlign?: 'left' | 'right',
): GoalBarPolygonPoint[] {
  if (typeof directionOrRight === 'string') {
    const boundedProgress = Math.max(0, Math.min(1, Number(progressOrLeft) || 0))
    if (boundedProgress <= 0 || points.length < MIN_POLYGON_POINTS) return []
    if (boundedProgress >= 1) return points.map((point) => ({ ...point }))
    const { axis, reversed } = resolveGoalBarDirection(directionOrRight)
    const boundary = reversed ? 1 - boundedProgress : boundedProgress
    const coordinate = axis === 'horizontal'
      ? (point: GoalBarPolygonPoint) => point.x
      : (point: GoalBarPolygonPoint) => point.y
    const isInside = reversed
      ? (point: GoalBarPolygonPoint) => coordinate(point) >= boundary
      : (point: GoalBarPolygonPoint) => coordinate(point) <= boundary
    const intersect = axis === 'horizontal' ? intersectVerticalEdge : intersectHorizontalEdge
    const output: GoalBarPolygonPoint[] = []
    for (let index = 0; index < points.length; index++) {
      const current = points[index]
      const previous = points[(index + points.length - 1) % points.length]
      const currentInside = isInside(current)
      const previousInside = isInside(previous)
      if (currentInside) {
        if (!previousInside) output.push(intersect(previous, current, boundary))
        output.push({ ...current })
      } else if (previousInside) {
        output.push(intersect(previous, current, boundary))
      }
    }
    const result = deduplicatePoints(output)
    return result.length >= MIN_POLYGON_POINTS ? result : []
  }

  const left = progressOrLeft
  const right = directionOrRight
  const progress = legacyProgress ?? 0
  const align = legacyAlign ?? 'left'
  const boundedProgress = Math.max(0, Math.min(1, Number(progress) || 0))
  if (boundedProgress <= 0 || points.length < MIN_POLYGON_POINTS) return []
  if (boundedProgress >= 1) return points.map((point) => ({ ...point }))

  const clipX = align === 'right' ? right - (right - left) * boundedProgress : left + (right - left) * boundedProgress
  const isInside = align === 'right' ? (point: GoalBarPolygonPoint) => point.x >= clipX : (point: GoalBarPolygonPoint) => point.x <= clipX
  const output: GoalBarPolygonPoint[] = []

  for (let index = 0; index < points.length; index++) {
    const current = points[index]
    const previous = points[(index + points.length - 1) % points.length]
    const currentInside = isInside(current)
    const previousInside = isInside(previous)

    if (currentInside) {
      if (!previousInside) output.push(intersectVerticalEdge(previous, current, clipX))
      output.push({ ...current })
    } else if (previousInside) {
      output.push(intersectVerticalEdge(previous, current, clipX))
    }
  }

  const result = deduplicatePoints(output)
  return result.length >= MIN_POLYGON_POINTS ? result : []
}
