import { describe, expect, it } from 'vitest'
import { DEFAULT_POLYGON_POINTS, clonePolygonPoints, normalizePolygonPoints } from './polygon.geometry'

describe('polygon geometry', () => {
  it('provides a valid defensive default hexagon', () => {
    const first = normalizePolygonPoints(undefined)
    const second = normalizePolygonPoints(undefined)
    expect(first).toEqual(DEFAULT_POLYGON_POINTS)
    expect(first).toHaveLength(6)
    expect(first).not.toBe(second)
    expect(first[0]).not.toBe(second[0])
  })

  it('preserves valid convex points and clones them', () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }]
    const normalized = normalizePolygonPoints(points)
    expect(normalized).toEqual(points)
    expect(normalized).not.toBe(points)
  })

  it('preserves a valid simple concave polygon', () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 0.4 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
    expect(normalizePolygonPoints(points)).toEqual(points)
  })

  it.each([
    [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 0, y: 0 }, { x: 1.1, y: 0 }, { x: 0.5, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 0 }],
  ])('falls back for invalid points', (...points) => {
    expect(normalizePolygonPoints(points)).toEqual(DEFAULT_POLYGON_POINTS)
  })

  it('clones points independently', () => {
    const cloned = clonePolygonPoints(DEFAULT_POLYGON_POINTS)
    cloned[0].x = 0.4
    expect(DEFAULT_POLYGON_POINTS[0].x).not.toBe(0.4)
  })
})
