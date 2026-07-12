import type { GoalBarPolygonPoint } from './goalBar.geometry'

export interface ClientRectLike {
  left: number
  top: number
  width: number
  height: number
}

export function clonePolygonPoints(points: GoalBarPolygonPoint[]): GoalBarPolygonPoint[] {
  return points.map((point) => ({ x: point.x, y: point.y }))
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function normalizedAxis(client: number, start: number, size: number): number {
  if (!Number.isFinite(size) || size <= 0) return 0
  const value = (finiteOrZero(client) - finiteOrZero(start)) / size
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
}

export function clientPointToNormalized(clientX: number, clientY: number, rect: ClientRectLike): GoalBarPolygonPoint {
  return {
    x: normalizedAxis(clientX, rect?.left, rect?.width),
    y: normalizedAxis(clientY, rect?.top, rect?.height)
  }
}

function squaredDistanceToSegment(point: GoalBarPolygonPoint, start: GoalBarPolygonPoint, end: GoalBarPolygonPoint): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared <= 0) return (point.x - start.x) ** 2 + (point.y - start.y) ** 2
  const projection = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))
  const closestX = start.x + projection * dx
  const closestY = start.y + projection * dy
  return (point.x - closestX) ** 2 + (point.y - closestY) ** 2
}

export function closestPolygonEdge(points: GoalBarPolygonPoint[], point: GoalBarPolygonPoint, tolerance: number): number | null {
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !Number.isFinite(point?.x) ||
    !Number.isFinite(point?.y) ||
    !Number.isFinite(tolerance) ||
    tolerance < 0 ||
    points.some((candidate) => !Number.isFinite(candidate?.x) || !Number.isFinite(candidate?.y))
  ) {
    return null
  }

  let closestIndex: number | null = null
  let closestDistanceSquared = tolerance * tolerance
  for (let index = 0; index < points.length; index++) {
    const distanceSquared = squaredDistanceToSegment(point, points[index], points[(index + 1) % points.length])
    if (distanceSquared <= closestDistanceSquared) {
      closestDistanceSquared = distanceSquared
      closestIndex = index
    }
  }
  return closestIndex
}
