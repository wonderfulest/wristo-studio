import { describe, expect, it } from 'vitest'
import {
  boundsFromCenter,
  expandBounds,
  findShortcutPlacement,
  intersectionArea,
  isBoundsInsideCircle,
  unionBounds,
  type DesignGeometry,
  type OccupiedPlacement,
  type ShortcutPlacementKind,
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
  const staticAnchors: Array<{
    kind: Exclude<ShortcutPlacementKind, 'axis' | 'date'>
    xRatio: number
    yRatio: number
  }> = [
    { kind: 'time', xRatio: 0.5, yRatio: 0.23 },
    { kind: 'status', xRatio: 0.28, yRatio: 0.16 },
    { kind: 'weather', xRatio: 0.3, yRatio: 0.28 },
    { kind: 'dataField', xRatio: 0.5, yRatio: 0.58 },
    { kind: 'chart', xRatio: 0.5, yRatio: 0.72 },
    { kind: 'goalBar', xRatio: 0.5, yRatio: 0.72 },
    { kind: 'goalArc', xRatio: 0.3, yRatio: 0.55 },
    { kind: 'shape', xRatio: 0.5, yRatio: 0.5 },
    { kind: 'image', xRatio: 0.5, yRatio: 0.5 },
  ]

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
    const gap = 8
    const area = request.footprint.width * request.footprint.height
    const testedCenters = [
      ...staticAnchors
        .filter(({ kind }) => kind === 'dataField')
        .map(({ xRatio, yRatio }) => ({ x: geometry.width * xRatio, y: geometry.height * yRatio })),
      { x: geometry.width * 0.32, y: geometry.height * 0.58 },
      { x: geometry.width * 0.68, y: geometry.height * 0.58 },
      { x: geometry.width * 0.32, y: geometry.height * 0.72 },
      { x: geometry.width * 0.68, y: geometry.height * 0.72 },
      { x: geometry.width * 0.5, y: geometry.height * 0.78 },
      { x: 222, y: 66 },
    ]
    const testedOverlapRatios = testedCenters
      .map((center) => boundsFromCenter(center, request.footprint))
      .filter((bounds) => isBoundsInsideCircle(bounds, geometry))
      .map(
        (bounds) =>
          occupied.reduce(
            (sum, item) => sum + intersectionArea(bounds, expandBounds(item, gap)),
            0,
          ) / area,
      )
    const chosenOverlapRatio =
      occupied.reduce(
        (sum, item) => sum + intersectionArea(first.bounds, expandBounds(item, gap)),
        0,
      ) / area
    expect(first).toEqual(second)
    expect(first.score.overlapRatio).toBe(chosenOverlapRatio)
    expect(first.score.overlapRatio).toBe(Math.min(...testedOverlapRatios))
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

  it('rejects non-finite and non-positive geometry or footprint values', () => {
    const invalidCases: Array<{
      field: string
      geometry?: Partial<DesignGeometry>
      footprint?: Partial<{ width: number; height: number }>
    }> = [
      { field: 'geometry.centerX', geometry: { centerX: Number.NaN } },
      { field: 'geometry.width', geometry: { width: 0 } },
      { field: 'geometry.height', geometry: { height: -1 } },
      { field: 'geometry.width', geometry: { width: Number.NaN } },
      { field: 'geometry.height', geometry: { height: Number.POSITIVE_INFINITY } },
      { field: 'geometry.centerY', geometry: { centerY: Number.POSITIVE_INFINITY } },
      { field: 'footprint.width', footprint: { width: 0 } },
      { field: 'footprint.height', footprint: { height: -1 } },
      { field: 'footprint.width', footprint: { width: Number.NaN } },
      { field: 'footprint.height', footprint: { height: Number.POSITIVE_INFINITY } },
    ]

    for (const invalid of invalidCases) {
      let thrown: unknown
      try {
        findShortcutPlacement({
          kind: 'time',
          mode: 'smart',
          geometry: { ...geometry, ...invalid.geometry },
          footprint: { ...footprint, ...invalid.footprint },
          occupied: [],
        })
      } catch (error) {
        thrown = error
      }
      expect(thrown).toBeInstanceOf(RangeError)
      expect((thrown as Error).message).toContain(invalid.field)
    }
  })

  it('throws when the footprint cannot fit inside the round safe area', () => {
    const oversizedRequest = {
      kind: 'time' as const,
      mode: 'smart' as const,
      geometry,
      footprint: { width: 500, height: 500 },
      occupied: [],
    }
    expect(() => findShortcutPlacement(oversizedRequest)).toThrowError(RangeError)
    expect(() => findShortcutPlacement(oversizedRequest)).toThrow(/cannot fit.*safe area/i)
  })

  it('uses the exact first anchor for every static placement kind', () => {
    const smallFootprint = { width: 20, height: 20 }
    for (const { kind, xRatio, yRatio } of staticAnchors) {
      const result = findShortcutPlacement({
        kind,
        mode: 'smart',
        geometry,
        footprint: smallFootprint,
        occupied: [],
      })
      expect(result.center).toEqual({
        x: geometry.width * xRatio,
        y: geometry.height * yRatio,
      })
      expect(result.score).toMatchObject({
        overlapRatio: 0,
        regionRank: 0,
        anchorDistance: 0,
        candidateIndex: 0,
      })
    }
  })

  it('does not mutate frozen occupied items or their array', () => {
    const occupied: OccupiedPlacement[] = [
      { id: 'lower-time', eleType: 'time', left: 177, top: 90, width: 100, height: 40 },
      { id: 'top-time', eleType: 'time', left: 177, top: 60, width: 100, height: 30 },
    ]
    occupied.forEach((item) => Object.freeze(item))
    Object.freeze(occupied)
    const before = JSON.stringify(occupied)

    expect(() =>
      findShortcutPlacement({
        kind: 'date',
        mode: 'smart',
        geometry,
        footprint: { width: 100, height: 20 },
        occupied,
      }),
    ).not.toThrow()
    expect(JSON.stringify(occupied)).toBe(before)
    expect(occupied.every((item) => Object.isFrozen(item))).toBe(true)
    expect(Object.isFrozen(occupied)).toBe(true)
  })

  it('uses the scaled 12px ring to preserve the scaled 8px occupied gap', () => {
    const smallGeometry = { width: 390, height: 390, centerX: 195, centerY: 195 }
    const scale = 390 / 454
    const ringStep = 12 * scale
    const gap = 8 * scale
    const smallFootprint = { width: 20, height: 20 }
    const anchor = { x: 195, y: 390 * 0.23 }
    const anchorBounds = boundsFromCenter(anchor, smallFootprint)
    const occupied: OccupiedPlacement[] = [
      {
        id: 'nearby',
        eleType: 'shape',
        left: 190,
        top: anchorBounds.top + anchorBounds.height + gap / 2,
        width: 10,
        height: 10,
      },
    ]
    const expandedOccupied = expandBounds(occupied[0], gap)

    expect(intersectionArea(anchorBounds, occupied[0])).toBe(0)
    expect(intersectionArea(anchorBounds, expandedOccupied)).toBeGreaterThan(0)

    const result = findShortcutPlacement({
      kind: 'time',
      mode: 'smart',
      geometry: smallGeometry,
      footprint: smallFootprint,
      occupied,
    })
    expect(result.center).toEqual({ x: anchor.x, y: anchor.y - ringStep })
    expect(result.score.anchorDistance).toBeCloseTo(ringStep, 10)
    expect(intersectionArea(result.bounds, expandedOccupied)).toBe(0)
  })
})
