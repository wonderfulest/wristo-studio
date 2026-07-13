import { isConvexPolygon, validateGoalBarPolygon } from '@/elements/goal/goalBar/goalBar.geometry'

export type PolygonPoint = { x: number; y: number }

export const DEFAULT_POLYGON_POINTS: ReadonlyArray<PolygonPoint> = Object.freeze([
  Object.freeze({ x: 0.25, y: 0 }),
  Object.freeze({ x: 0.75, y: 0 }),
  Object.freeze({ x: 1, y: 0.5 }),
  Object.freeze({ x: 0.75, y: 1 }),
  Object.freeze({ x: 0.25, y: 1 }),
  Object.freeze({ x: 0, y: 0.5 }),
])

export function clonePolygonPoints(points: ReadonlyArray<PolygonPoint>): PolygonPoint[] {
  return points.map((point) => ({ x: point.x, y: point.y }))
}

export function isValidPolygonPoints(value: unknown): value is PolygonPoint[] {
  return Array.isArray(value) && validateGoalBarPolygon(value as PolygonPoint[]).valid
}

export function isConvexPolygonPoints(value: unknown): value is PolygonPoint[] {
  return isValidPolygonPoints(value) && isConvexPolygon(value)
}

export function normalizePolygonPoints(value: unknown): PolygonPoint[] {
  return isValidPolygonPoints(value)
    ? clonePolygonPoints(value)
    : clonePolygonPoints(DEFAULT_POLYGON_POINTS)
}

export function denormalizePolygonPoints(points: ReadonlyArray<PolygonPoint>, width: number, height: number): PolygonPoint[] {
  return points.map((point) => ({ x: point.x * width, y: point.y * height }))
}
