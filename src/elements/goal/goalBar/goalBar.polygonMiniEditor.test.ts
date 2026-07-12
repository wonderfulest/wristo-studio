import { describe, expect, it } from 'vitest'
import { clientPointToNormalized, clonePolygonPoints, closestPolygonEdge } from './goalBar.polygonMiniEditor'

describe('clientPointToNormalized', () => {
  const rect = { left: 20, top: 40, width: 200, height: 100 }

  it.each([
    [20, 40, { x: 0, y: 0 }],
    [220, 140, { x: 1, y: 1 }],
    [120, 90, { x: 0.5, y: 0.5 }]
  ])('maps client point (%s, %s) into normalized coordinates', (clientX, clientY, expected) => {
    expect(clientPointToNormalized(clientX, clientY, rect)).toEqual(expected)
  })

  it('clamps coordinates outside the client rectangle', () => {
    expect(clientPointToNormalized(-100, 500, rect)).toEqual({ x: 0, y: 1 })
  })

  it.each([
    [{ left: 20, top: 40, width: 0, height: -1 }, 50, 60],
    [{ left: Number.NaN, top: Number.POSITIVE_INFINITY, width: 100, height: 100 }, Number.NaN, Number.NEGATIVE_INFINITY]
  ])('returns finite normalized coordinates for invalid input', (invalidRect, clientX, clientY) => {
    const point = clientPointToNormalized(clientX, clientY, invalidRect)
    expect(Number.isFinite(point.x)).toBe(true)
    expect(Number.isFinite(point.y)).toBe(true)
    expect(point.x).toBeGreaterThanOrEqual(0)
    expect(point.x).toBeLessThanOrEqual(1)
    expect(point.y).toBeGreaterThanOrEqual(0)
    expect(point.y).toBeLessThanOrEqual(1)
  })
})

describe('closestPolygonEdge', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ]

  it('returns the nearest closed-polygon edge within tolerance', () => {
    expect(closestPolygonEdge(square, { x: 0.4, y: 0.03 }, 0.05)).toBe(0)
    expect(closestPolygonEdge(square, { x: 0.02, y: 0.6 }, 0.05)).toBe(3)
  })

  it('returns null when every edge is beyond tolerance', () => {
    expect(closestPolygonEdge(square, { x: 0.5, y: 0.5 }, 0.1)).toBeNull()
  })

  it('safely rejects invalid polygon, point, and tolerance input', () => {
    expect(closestPolygonEdge([], { x: 0, y: 0 }, 1)).toBeNull()
    expect(closestPolygonEdge(square, { x: Number.NaN, y: 0 }, 1)).toBeNull()
    expect(closestPolygonEdge(square, { x: 0, y: 0 }, Number.NaN)).toBeNull()
  })
})

describe('clonePolygonPoints', () => {
  it('creates independent arrays and point objects on every call', () => {
    const source = [{ x: 0.25, y: 0.75 }]

    const first = clonePolygonPoints(source)
    const second = clonePolygonPoints(source)

    expect(first).toEqual(source)
    expect(second).toEqual(source)
    expect(first).not.toBe(source)
    expect(first).not.toBe(second)
    expect(first[0]).not.toBe(source[0])
    expect(first[0]).not.toBe(second[0])

    first[0].x = 1
    expect(source[0].x).toBe(0.25)
    expect(second[0].x).toBe(0.25)
  })
})
