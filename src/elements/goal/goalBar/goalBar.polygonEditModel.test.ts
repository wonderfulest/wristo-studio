import { describe, expect, it } from 'vitest'
import { type GoalBarPolygonPoint } from './goalBar.geometry'
import { createPolygonEditModel } from './goalBar.polygonEditModel'

const square: GoalBarPolygonPoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 }
]

const eightPointBoundary: GoalBarPolygonPoint[] = [
  { x: 0, y: 0 },
  { x: 0.5, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 0.5 },
  { x: 1, y: 1 },
  { x: 0.5, y: 1 },
  { x: 0, y: 1 },
  { x: 0, y: 0.5 }
]

describe('createPolygonEditModel in create mode', () => {
  it('commits the fixed normalized panel coordinates without bounds', () => {
    const polygonPoints = [
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.2 },
      { x: 0.5, y: 0.8 }
    ]
    const model = createPolygonEditModel({ mode: 'create', points: [] })

    expect(polygonPoints.map((point) => model.addPoint(point))).toEqual([true, true, true])
    expect(model.close()).toBe(true)
    expect(model.getCommitResult()).toEqual({ polygonPoints })
    expect(model.getCommitResult()).not.toHaveProperty('bounds')
  })

  it('clamps created points to the normalized panel before closing', () => {
    const model = createPolygonEditModel({ mode: 'create', points: [] })

    expect(model.addPoint({ x: -1, y: 0.1 })).toBe(true)
    expect(model.addPoint({ x: 1.2, y: 0.1 })).toBe(true)
    expect(model.addPoint({ x: 0.5, y: 0.9 })).toBe(true)
    expect(model.points).toEqual([
      { x: 0, y: 0.1 },
      { x: 1, y: 0.1 },
      { x: 0.5, y: 0.9 }
    ])
    expect(model.close()).toBe(true)
  })

  it('closes normalized points idempotently', () => {
    const model = createPolygonEditModel({ mode: 'create', points: [] })

    expect(square.map((point) => model.addPoint(point))).toEqual([true, true, true, true])
    expect(model.close()).toBe(true)
    expect(model.close()).toBe(true)
    expect(model.closed).toBe(true)
    expect(model.points).toEqual(square)
    expect(model.getCommitResult()).toEqual({ polygonPoints: square })
  })

  it('requires at least three points and accepts at most eight boundary points', () => {
    const tooShort = createPolygonEditModel({ mode: 'create', points: [] })
    expect(tooShort.addPoint({ x: 0, y: 0 })).toBe(true)
    expect(tooShort.addPoint({ x: 1, y: 0 })).toBe(true)
    expect(tooShort.close()).toBe(false)
    expect(tooShort.closed).toBe(false)

    const model = createPolygonEditModel({ mode: 'create', points: [] })
    expect(eightPointBoundary.map((point) => model.addPoint(point))).toEqual(Array(8).fill(true))
    expect(model.addPoint({ x: 0, y: 0.1 })).toBe(false)
    expect(model.points).toEqual(eightPointBoundary)
  })

  it('rejects duplicates and intersections in the newly opened edge', () => {
    const duplicate = createPolygonEditModel({ mode: 'create', points: [] })
    expect(duplicate.addPoint({ x: 0.1, y: 0.1 })).toBe(true)
    expect(duplicate.addPoint({ x: 0.4, y: 0.1 })).toBe(true)
    expect(duplicate.addPoint({ x: 0.1, y: 0.1 })).toBe(false)

    const crossing = createPolygonEditModel({ mode: 'create', points: [] })
    expect(crossing.addPoint({ x: 0, y: 0 })).toBe(true)
    expect(crossing.addPoint({ x: 1, y: 1 })).toBe(true)
    expect(crossing.addPoint({ x: 0, y: 1 })).toBe(true)
    expect(crossing.addPoint({ x: 1, y: 0 })).toBe(false)
    expect(crossing.points).toHaveLength(3)
  })

  it('allows an unfinished or initially collinear path and defers closing validation', () => {
    const collinear = createPolygonEditModel({ mode: 'create', points: [] })
    expect(collinear.addPoint({ x: 0, y: 0 })).toBe(true)
    expect(collinear.addPoint({ x: 0.5, y: 0 })).toBe(true)
    expect(collinear.addPoint({ x: 1, y: 0 })).toBe(true)
    expect(collinear.closed).toBe(false)

    const concaveOnClose = createPolygonEditModel({ mode: 'create', points: [] })
    const concavePoints = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0.7, y: 0.4 }
    ]
    expect(concavePoints.map((point) => concaveOnClose.addPoint(point))).toEqual(Array(4).fill(true))
    expect(concaveOnClose.close()).toBe(false)

    const tooSmall = createPolygonEditModel({ mode: 'create', points: [] })
    const thinPoints = [
      { x: 0, y: 0 },
      { x: 0.0005, y: 0 },
      { x: 1, y: 0.9995 },
      { x: 1, y: 1 }
    ]
    expect(thinPoints.map((point) => tooSmall.addPoint(point))).toEqual(Array(4).fill(true))
    expect(tooSmall.close()).toBe(false)
  })

  it('rejects a new non-zero turn that reverses the open path winding', () => {
    const model = createPolygonEditModel({ mode: 'create', points: [] })
    expect(model.addPoint({ x: 0, y: 0 })).toBe(true)
    expect(model.addPoint({ x: 0.6, y: 0 })).toBe(true)
    expect(model.addPoint({ x: 0.6, y: 0.6 })).toBe(true)
    expect(model.addPoint({ x: 1, y: 0.3 })).toBe(false)
  })

  it('evaluates near-collinear turns in fixed normalized coordinates', () => {
    const nearCollinearInset = 0.0000001
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0.5, y: 1 - nearCollinearInset },
      { x: 0, y: 1 }
    ]
    const model = createPolygonEditModel({ mode: 'create', points: [] })

    expect(points.map((point) => model.addPoint(point))).toEqual(Array(5).fill(true))
    expect(model.close()).toBe(true)
  })

  it('uses normalized epsilon for duplicates and near-collinear open edge contacts', () => {
    const duplicate = createPolygonEditModel({ mode: 'create', points: [] })
    expect(duplicate.addPoint({ x: 0, y: 0 })).toBe(true)
    expect(duplicate.addPoint({ x: 1, y: 0 })).toBe(true)
    expect(duplicate.addPoint({ x: 1, y: 1 })).toBe(true)
    expect(duplicate.addPoint({ x: 0.0000005, y: 0.0000005 })).toBe(false)

    const nearEdgeContact = createPolygonEditModel({ mode: 'create', points: [] })
    expect(nearEdgeContact.addPoint({ x: 0, y: 0 })).toBe(true)
    expect(nearEdgeContact.addPoint({ x: 1, y: 0 })).toBe(true)
    expect(nearEdgeContact.addPoint({ x: 1, y: 1 })).toBe(true)
    expect(nearEdgeContact.addPoint({ x: 0.5, y: 0.0000005 })).toBe(false)
  })
})

describe('createPolygonEditModel in edit mode', () => {
  it('keeps committed points when an invalid move preview is finished', () => {
    const model = createPolygonEditModel({ mode: 'edit', points: square })

    const preview = model.previewMove(2, { x: 0.4, y: 0.4 })

    expect(preview).toMatchObject({ valid: false, reason: 'concave' })
    expect(model.points).toEqual(square)
    expect(model.acceptMove()).toBe(false)
    model.finishMove()
    expect(model.preview).toBeNull()
    expect(model.points).toEqual(square)
  })

  it('commits only an accepted valid preview and clamps its coordinates', () => {
    const model = createPolygonEditModel({ mode: 'edit', points: square })

    const preview = model.previewMove(1, { x: 2, y: 0.2 })

    expect(preview.valid).toBe(true)
    expect(preview.points[1]).toEqual({ x: 1, y: 0.2 })
    expect(model.points).toEqual(square)
    expect(model.acceptMove()).toBe(true)
    expect(model.points[1]).toEqual({ x: 1, y: 0.2 })
    model.finishMove()
    expect(model.preview).toBeNull()
  })

  it('returns finite points for non-finite moves without creating or replacing a preview', () => {
    const model = createPolygonEditModel({ mode: 'edit', points: square })

    const withoutPendingPreview = model.previewMove(1, { x: Number.NaN, y: Number.POSITIVE_INFINITY })
    expect(withoutPendingPreview).toMatchObject({ valid: false, reason: 'range', points: square })
    expect(withoutPendingPreview.points.flatMap((point) => [point.x, point.y]).every(Number.isFinite)).toBe(true)
    expect(model.preview).toBeNull()

    const validPreview = model.previewMove(1, { x: 0.8, y: 0.2 })
    expect(validPreview.valid).toBe(true)
    const invalidMove = model.previewMove(1, { x: Number.NEGATIVE_INFINITY, y: 0 })
    expect(invalidMove).toMatchObject({ valid: false, reason: 'range', points: square })
    expect(invalidMove.points.flatMap((point) => [point.x, point.y]).every(Number.isFinite)).toBe(true)
    expect(model.preview).toEqual(validPreview)
  })

  it('keeps a valid preview after an invalid index and rejects close in edit mode', () => {
    const model = createPolygonEditModel({ mode: 'edit', points: square })
    const validPreview = model.previewMove(1, { x: 0.8, y: 0.2 })

    expect(model.previewMove(square.length, { x: 0, y: 0 })).toEqual({ points: square, valid: false, reason: 'range' })
    expect(model.preview).toEqual(validPreview)
    expect(model.acceptMove()).toBe(true)
    expect(model.points[1]).toEqual({ x: 0.8, y: 0.2 })
    expect(model.close()).toBe(false)

    const create = createPolygonEditModel({ mode: 'create', points: square })
    expect(create.previewMove(0, { x: 0.5, y: 0.5 })).toEqual({ points: square, valid: false, reason: 'range' })
    expect(create.preview).toBeNull()
  })

  it('inserts a valid point after an edge and rejects max-count or invalid insertions atomically', () => {
    const model = createPolygonEditModel({ mode: 'edit', points: square })
    expect(model.insertOnEdge(0, { x: 0.5, y: 0 })).toBe(true)
    expect(model.points).toEqual([
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ])

    const beforeInvalidInsert = model.points
    expect(model.insertOnEdge(0, { x: 0.5, y: 0.5 })).toBe(false)
    expect(model.insertOnEdge(0, { x: -0.1, y: 0 })).toBe(false)
    expect(model.points).toEqual(beforeInvalidInsert)

    const full = createPolygonEditModel({ mode: 'edit', points: eightPointBoundary })
    expect(full.insertOnEdge(0, { x: 0.5, y: 0 })).toBe(false)
    expect(full.points).toEqual(eightPointBoundary)
  })

  it('deletes only while a valid polygon remains and updates selection', () => {
    const model = createPolygonEditModel({
      mode: 'edit',
      points: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ]
    })

    model.selectPoint(3)
    expect(model.deletePoint(1)).toBe(true)
    expect(model.selectedIndex).toBe(2)
    expect(model.deletePoint(2)).toBe(true)
    expect(model.selectedIndex).toBeNull()
    expect(model.points).toHaveLength(3)
    expect(model.deletePoint(0)).toBe(false)
    expect(model.points).toHaveLength(3)
  })

  it('clears selection for null, fractional, and out-of-range indices', () => {
    const model = createPolygonEditModel({ mode: 'edit', points: square })

    model.selectPoint(2)
    expect(model.selectedIndex).toBe(2)
    for (const index of [null, -1, 1.5, square.length, Number.NaN]) {
      model.selectPoint(index)
      expect(model.selectedIndex).toBeNull()
    }
  })
})

describe('createPolygonEditModel after closing create mode', () => {
  function createClosedSquare() {
    const model = createPolygonEditModel({ mode: 'create', points: [] })
    square.forEach((point) => expect(model.addPoint(point)).toBe(true))
    expect(model.close()).toBe(true)
    return model
  }

  it('supports accepting a valid node move', () => {
    const model = createClosedSquare()

    expect(model.previewMove(1, { x: 1, y: 0.2 }).valid).toBe(true)
    expect(model.acceptMove()).toBe(true)
    model.finishMove()

    expect(model.points[1]).toEqual({ x: 1, y: 0.2 })
    expect(model.closed).toBe(true)
    expect(model.getCommitResult()?.polygonPoints[1]).toEqual({ x: 1, y: 0.2 })
  })

  it('supports inserting on an edge', () => {
    const model = createClosedSquare()

    expect(model.insertOnEdge(0, { x: 0.5, y: 0 })).toBe(true)

    expect(model.points).toHaveLength(5)
    expect(model.points[1]).toEqual({ x: 0.5, y: 0 })
    expect(model.closed).toBe(true)
    expect(model.getCommitResult()?.polygonPoints).toHaveLength(5)
  })

  it('supports deletion while retaining a valid closed polygon of at least three points', () => {
    const model = createClosedSquare()

    expect(model.deletePoint(1)).toBe(true)
    expect(model.points).toHaveLength(3)
    expect(model.closed).toBe(true)
    expect(model.deletePoint(0)).toBe(false)
    expect(model.points).toHaveLength(3)
    expect(model.getCommitResult()?.polygonPoints).toHaveLength(3)
  })
})

describe('polygon edit model snapshots and commit results', () => {
  it('cancels edit changes and does not expose mutable input, state, preview, or result references', () => {
    const input = square.map((point) => ({ ...point }))
    const model = createPolygonEditModel({ mode: 'edit', points: input })
    input[0].x = 0.25
    expect(model.points).toEqual(square)

    model.selectPoint(3)
    const preview = model.previewMove(1, { x: 0.8, y: 0.2 })
    preview.points[1].x = 0.1
    expect(model.preview?.points[1]).toEqual({ x: 0.8, y: 0.2 })
    expect(model.acceptMove()).toBe(true)

    const exposedPoints = model.points
    exposedPoints[0].x = 0.5
    exposedPoints.push({ x: 0.5, y: 0.5 })
    expect(model.points).toHaveLength(4)
    expect(model.points[0]).toEqual(square[0])

    model.cancel()
    expect(model.closed).toBe(true)
    expect(model.points).toEqual(square)
    expect(model.selectedIndex).toBeNull()
    expect(model.preview).toBeNull()

    const result = model.getCommitResult()
    expect(result).toEqual({ polygonPoints: square })
    result!.polygonPoints[0].x = 0.5
    expect(model.getCommitResult()).toEqual({ polygonPoints: square })
  })

  it('cancels create mode back to its initial normalized snapshot', () => {
    const input = [{ x: 0.2, y: 0.3 }]
    const model = createPolygonEditModel({ mode: 'create', points: input })
    input[0].x = 999

    expect(model.addPoint({ x: 0.8, y: 0.3 })).toBe(true)
    expect(model.addPoint({ x: 0.2, y: 0.8 })).toBe(true)
    expect(model.close()).toBe(true)
    model.selectPoint(1)

    const result = model.getCommitResult()!
    result.polygonPoints[0].x = 0.5
    expect(model.getCommitResult()).toEqual({
      polygonPoints: [
        { x: 0.2, y: 0.3 },
        { x: 0.8, y: 0.3 },
        { x: 0.2, y: 0.8 }
      ]
    })

    model.cancel()
    expect(model.points).toEqual([{ x: 0.2, y: 0.3 }])
    expect(model.closed).toBe(false)
    expect(model.selectedIndex).toBeNull()
    expect(model.preview).toBeNull()
    expect(model.getCommitResult()).toBeNull()
  })

  it('returns current normalized edit points without bounds and null for uncommittable create state', () => {
    const edit = createPolygonEditModel({ mode: 'edit', points: square })
    expect(edit.getCommitResult()).toEqual({ polygonPoints: square })
    expect(edit.getCommitResult()).not.toHaveProperty('bounds')

    const open = createPolygonEditModel({ mode: 'create', points: square })
    expect(open.getCommitResult()).toBeNull()

    const invalid = createPolygonEditModel({ mode: 'create', points: [] })
    expect(invalid.addPoint({ x: 0, y: 0 })).toBe(true)
    expect(invalid.addPoint({ x: 1, y: 0 })).toBe(true)
    expect(invalid.addPoint({ x: 0.5, y: 0 })).toBe(true)
    expect(invalid.close()).toBe(false)
    expect(invalid.getCommitResult()).toBeNull()
  })
})
