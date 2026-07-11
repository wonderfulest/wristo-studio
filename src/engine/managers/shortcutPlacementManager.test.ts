import { describe, expect, it } from 'vitest'
import {
  boundsFromCenter,
  findShortcutPlacement,
  intersectionArea,
  isBoundsInsideCircle,
  unionBounds,
  type DesignGeometry,
  type OccupiedPlacement,
} from './shortcutPlacementManager'

const geometry: DesignGeometry = {
  width: 454,
  height: 454,
  centerX: 227,
  centerY: 227,
}

describe('shortcut placement geometry', () => {
  it('builds centered bounds', () => {
    expect(boundsFromCenter({ x: 227, y: 100 }, { width: 100, height: 40 })).toEqual({
      left: 177,
      top: 80,
      width: 100,
      height: 40,
    })
  })

  it('calculates overlap area', () => {
    expect(
      intersectionArea(
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 60, top: 40, width: 100, height: 100 },
      ),
    ).toBe(2400)
  })

  it('joins multiple element bounds', () => {
    expect(
      unionBounds([
        { left: 10, top: 20, width: 40, height: 30 },
        { left: 70, top: 10, width: 20, height: 80 },
      ]),
    ).toEqual({ left: 10, top: 10, width: 80, height: 80 })
  })

  it('rejects rectangle corners outside the round safe area', () => {
    expect(isBoundsInsideCircle({ left: 177, top: 80, width: 100, height: 40 }, geometry)).toBe(
      true,
    )
    expect(isBoundsInsideCircle({ left: 0, top: 0, width: 100, height: 40 }, geometry)).toBe(
      false,
    )
  })
})

describe('findShortcutPlacement', () => {
  const footprint = { width: 100, height: 40 }

  it('keeps axis elements at the design center', () => {
    const result = findShortcutPlacement({
      kind: 'axis',
      mode: 'fixedCenter',
      geometry,
      footprint,
      occupied: [],
    })
    expect(result.center).toEqual({ x: 227, y: 227 })
  })

  it('prefers the upper center for time', () => {
    const result = findShortcutPlacement({
      kind: 'time',
      mode: 'smart',
      geometry,
      footprint,
      occupied: [],
    })
    expect(result.center.x).toBe(227)
    expect(result.center.y).toBeLessThan(180)
    expect(result.score.overlapRatio).toBe(0)
  })

  it('moves away from an occupied preferred anchor', () => {
    const occupied: OccupiedPlacement[] = [
      {
        id: 'existing-time',
        eleType: 'time',
        left: 157,
        top: 65,
        width: 140,
        height: 70,
      },
    ]
    const result = findShortcutPlacement({
      kind: 'time',
      mode: 'smart',
      geometry,
      footprint,
      occupied,
    })
    expect(intersectionArea(result.bounds, occupied[0])).toBe(0)
  })

  it('places a date below an existing time when that space is free', () => {
    const occupied: OccupiedPlacement[] = [
      {
        id: 'time-1',
        eleType: 'time',
        left: 147,
        top: 70,
        width: 160,
        height: 60,
      },
    ]
    const result = findShortcutPlacement({
      kind: 'date',
      mode: 'smart',
      geometry,
      footprint: { width: 120, height: 30 },
      occupied,
    })
    expect(result.center.x).toBe(227)
    expect(result.bounds.top).toBeGreaterThanOrEqual(138)
  })

  it('returns the same least-overlap result for the same crowded canvas', () => {
    const occupied: OccupiedPlacement[] = [
      { id: 'a', eleType: 'data', left: 80, top: 120, width: 290, height: 100 },
      { id: 'b', eleType: 'barChart', left: 80, top: 230, width: 290, height: 100 },
    ]
    const request = {
      kind: 'dataField' as const,
      mode: 'smart' as const,
      geometry,
      footprint: { width: 120, height: 80 },
      occupied,
    }
    const first = findShortcutPlacement(request)
    const second = findShortcutPlacement(request)
    expect(first).toEqual(second)
    expect(isBoundsInsideCircle(first.bounds, geometry)).toBe(true)
  })

  it('scales semantic anchors for a non-454 design', () => {
    const smallGeometry = { width: 390, height: 390, centerX: 195, centerY: 195 }
    const result = findShortcutPlacement({
      kind: 'time',
      mode: 'smart',
      geometry: smallGeometry,
      footprint,
      occupied: [],
    })
    expect(result.center.x).toBe(195)
    expect(result.center.y).toBeLessThan(160)
    expect(isBoundsInsideCircle(result.bounds, smallGeometry)).toBe(true)
  })
})
