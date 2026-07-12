import {
  MAX_POLYGON_POINTS,
  MIN_POLYGON_POINTS,
  POLYGON_EPSILON,
  insertPointOnEdge,
  validateGoalBarPolygon,
  type GoalBarPolygonPoint,
  type PolygonValidationReason
} from './goalBar.geometry'

export type PolygonEditMode = 'create' | 'edit'

export type PolygonEditPreview = {
  points: GoalBarPolygonPoint[]
  valid: boolean
  reason?: PolygonValidationReason
}

export interface PolygonEditModel {
  readonly mode: PolygonEditMode
  readonly points: GoalBarPolygonPoint[]
  readonly closed: boolean
  readonly selectedIndex: number | null
  readonly preview: PolygonEditPreview | null
  addPoint(point: GoalBarPolygonPoint): boolean
  close(): boolean
  selectPoint(index: number | null): void
  previewMove(index: number, point: GoalBarPolygonPoint): PolygonEditPreview
  acceptMove(): boolean
  finishMove(): void
  insertOnEdge(edgeIndex: number, point: GoalBarPolygonPoint): boolean
  deletePoint(index: number): boolean
  cancel(): void
  getCommitResult(): { polygonPoints: GoalBarPolygonPoint[] } | null
}

type CreateCommit = {
  polygonPoints: GoalBarPolygonPoint[]
}

function copyPoints(points: GoalBarPolygonPoint[]): GoalBarPolygonPoint[] {
  return points.map((point) => ({ ...point }))
}

function copyPreview(preview: PolygonEditPreview): PolygonEditPreview {
  return {
    points: copyPoints(preview.points),
    valid: preview.valid,
    ...(preview.reason === undefined ? {} : { reason: preview.reason })
  }
}

function isFinitePoint(point: GoalBarPolygonPoint): boolean {
  return Number.isFinite(point?.x) && Number.isFinite(point?.y)
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

function newSegmentIntersectsEarlierEdge(points: GoalBarPolygonPoint[]): boolean {
  if (points.length < 4) return false

  const newStart = points[points.length - 2]
  const newEnd = points[points.length - 1]
  for (let edgeIndex = 0; edgeIndex < points.length - 3; edgeIndex++) {
    if (segmentsIntersect(newStart, newEnd, points[edgeIndex], points[edgeIndex + 1])) {
      return true
    }
  }
  return false
}

function hasReversedNonZeroTurn(points: GoalBarPolygonPoint[]): boolean {
  let windingDirection = 0
  for (let index = 0; index < points.length - 2; index++) {
    const cross = crossProduct(points[index], points[index + 1], points[index + 2])
    if (Math.abs(cross) <= POLYGON_EPSILON) continue

    const direction = Math.sign(cross)
    if (windingDirection !== 0 && direction !== windingDirection) return true
    windingDirection = direction
  }
  return false
}

function clampCoordinate(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : value
}

function createPreview(points: GoalBarPolygonPoint[]): PolygonEditPreview {
  const validation = validateGoalBarPolygon(points)
  if (validation.valid) return { points: copyPoints(points), valid: true }
  return { points: copyPoints(points), valid: false, reason: validation.reason }
}

class GoalBarPolygonEditModel implements PolygonEditModel {
  readonly mode: PolygonEditMode

  private readonly initialPoints: GoalBarPolygonPoint[]
  private readonly initialClosed: boolean
  private currentPoints: GoalBarPolygonPoint[]
  private isClosed: boolean
  private currentSelectedIndex: number | null = null
  private currentPreview: PolygonEditPreview | null = null
  private createCommit: CreateCommit | null = null

  constructor(input: { mode: PolygonEditMode; points: GoalBarPolygonPoint[] }) {
    this.mode = input.mode
    this.initialPoints = copyPoints(input.points)
    this.initialClosed = input.mode === 'edit'
    this.currentPoints = copyPoints(this.initialPoints)
    this.isClosed = this.initialClosed
  }

  get points(): GoalBarPolygonPoint[] {
    return copyPoints(this.currentPoints)
  }

  get closed(): boolean {
    return this.isClosed
  }

  get selectedIndex(): number | null {
    return this.currentSelectedIndex
  }

  get preview(): PolygonEditPreview | null {
    return this.currentPreview === null ? null : copyPreview(this.currentPreview)
  }

  addPoint(point: GoalBarPolygonPoint): boolean {
    if (this.mode !== 'create' || this.isClosed || this.currentPoints.length >= MAX_POLYGON_POINTS || !isFinitePoint(point)) {
      return false
    }

    const clampedPoint = {
      x: clampCoordinate(point.x),
      y: clampCoordinate(point.y)
    }
    const candidate = [...copyPoints(this.currentPoints), clampedPoint]
    if (candidate.slice(0, -1).some((current) => arePointsEqual(current, clampedPoint))) return false
    if (newSegmentIntersectsEarlierEdge(candidate)) return false
    if (hasReversedNonZeroTurn(candidate)) return false

    this.currentPoints = candidate
    return true
  }

  close(): boolean {
    if (this.mode !== 'create') return false
    if (this.isClosed) return true

    if (!validateGoalBarPolygon(this.currentPoints).valid) return false

    this.isClosed = true
    this.currentPreview = null
    this.createCommit = {
      polygonPoints: copyPoints(this.currentPoints)
    }
    return true
  }

  selectPoint(index: number | null): void {
    this.currentSelectedIndex = index !== null && Number.isInteger(index) && index >= 0 && index < this.currentPoints.length ? index : null
  }

  previewMove(index: number, point: GoalBarPolygonPoint): PolygonEditPreview {
    if (!this.isClosed || !Number.isInteger(index) || index < 0 || index >= this.currentPoints.length || !isFinitePoint(point)) {
      return { points: copyPoints(this.currentPoints), valid: false, reason: 'range' }
    }

    const candidate = copyPoints(this.currentPoints)
    candidate[index] = {
      x: clampCoordinate(point?.x),
      y: clampCoordinate(point?.y)
    }
    this.currentPreview = createPreview(candidate)
    return copyPreview(this.currentPreview)
  }

  acceptMove(): boolean {
    if (this.currentPreview === null || !this.currentPreview.valid) return false
    this.currentPoints = copyPoints(this.currentPreview.points)
    return true
  }

  finishMove(): void {
    this.currentPreview = null
  }

  insertOnEdge(edgeIndex: number, point: GoalBarPolygonPoint): boolean {
    if (!this.isClosed || this.currentPoints.length >= MAX_POLYGON_POINTS || !Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= this.currentPoints.length || !isFinitePoint(point)) {
      return false
    }

    const candidate = insertPointOnEdge(this.currentPoints, edgeIndex, point)
    if (!validateGoalBarPolygon(candidate).valid) return false

    this.currentPoints = candidate
    if (this.currentSelectedIndex !== null && this.currentSelectedIndex > edgeIndex) {
      this.currentSelectedIndex += 1
    }
    this.currentPreview = null
    return true
  }

  deletePoint(index: number): boolean {
    if (!this.isClosed || this.currentPoints.length <= MIN_POLYGON_POINTS || !Number.isInteger(index) || index < 0 || index >= this.currentPoints.length) {
      return false
    }

    const candidate = this.currentPoints.filter((_point, pointIndex) => pointIndex !== index)
    if (!validateGoalBarPolygon(candidate).valid) return false

    this.currentPoints = copyPoints(candidate)
    if (this.currentSelectedIndex === index) {
      this.currentSelectedIndex = null
    } else if (this.currentSelectedIndex !== null && this.currentSelectedIndex > index) {
      this.currentSelectedIndex -= 1
    }
    this.currentPreview = null
    return true
  }

  cancel(): void {
    this.currentPoints = copyPoints(this.initialPoints)
    this.isClosed = this.initialClosed
    this.currentSelectedIndex = null
    this.currentPreview = null
    this.createCommit = null
  }

  getCommitResult(): { polygonPoints: GoalBarPolygonPoint[] } | null {
    if (!this.isClosed) return null
    if (this.mode === 'create' && this.createCommit === null) return null
    return { polygonPoints: copyPoints(this.currentPoints) }
  }
}

export function createPolygonEditModel(input: { mode: PolygonEditMode; points: GoalBarPolygonPoint[] }): PolygonEditModel {
  return new GoalBarPolygonEditModel(input)
}
