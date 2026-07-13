import { describe, expect, it } from 'vitest'
import {
  MAX_POLYGON_POINTS,
  MIN_NORMALIZED_POLYGON_AREA,
  MIN_POLYGON_POINTS,
  clipGoalBarPolygon,
  denormalizePolygonPoints,
  insertPointOnEdge,
  migrateLegacyGoalBarPolygon,
  normalizeGoalBarPolygonConfig,
  normalizePolygonPoints,
  validateGoalBarPolygon,
  isConvexPolygon,
  type GoalBarLegacyShape,
  type GoalBarPolygonPoint
} from './goalBar.geometry'

const square: GoalBarPolygonPoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 }
]

describe('validateGoalBarPolygon', () => {
  it('classifies convex and concave polygons independently from validity', () => {
    expect(isConvexPolygon(square)).toBe(true)
    expect(isConvexPolygon([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 0.4 }, { x: 1, y: 1 }, { x: 0, y: 1 }
    ])).toBe(false)
  })
  it.each([
    [
      'three points',
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.5, y: 1 }
      ]
    ],
    ['four points', square],
    [
      'eight points',
      [
        { x: 0.25, y: 0 },
        { x: 0.75, y: 0 },
        { x: 1, y: 0.25 },
        { x: 1, y: 0.75 },
        { x: 0.75, y: 1 },
        { x: 0.25, y: 1 },
        { x: 0, y: 0.75 },
        { x: 0, y: 0.25 }
      ]
    ]
  ])('accepts a normalized convex polygon with %s', (_label, points) => {
    expect(validateGoalBarPolygon(points as GoalBarPolygonPoint[])).toEqual({ valid: true })
  })

  it('allows collinear vertices when the polygon still has area', () => {
    expect(
      validateGoalBarPolygon([
        { x: 0, y: 0 },
        { x: 0.5, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ])
    ).toEqual({ valid: true })
  })

  it.each([
    ['too few points', square.slice(0, MIN_POLYGON_POINTS - 1)],
    [
      'too many points',
      Array.from({ length: MAX_POLYGON_POINTS + 1 }, (_, index) => ({
        x: 0.5 + 0.45 * Math.cos((Math.PI * 2 * index) / (MAX_POLYGON_POINTS + 1)),
        y: 0.5 + 0.45 * Math.sin((Math.PI * 2 * index) / (MAX_POLYGON_POINTS + 1))
      }))
    ]
  ])('rejects %s', (_label, points) => {
    expect(validateGoalBarPolygon(points)).toEqual({ valid: false, reason: 'pointCount' })
  })

  it.each([
    ['NaN', [{ x: Number.NaN, y: 0 }, ...square.slice(1)]],
    ['Infinity', [{ x: 0, y: Number.POSITIVE_INFINITY }, ...square.slice(1)]],
    ['a negative coordinate', [{ x: -0.01, y: 0 }, ...square.slice(1)]],
    ['a coordinate above one', [{ x: 0, y: 1.01 }, ...square.slice(1)]]
  ])('rejects %s as out of range', (_label, points) => {
    expect(validateGoalBarPolygon(points)).toEqual({ valid: false, reason: 'range' })
  })

  it('rejects duplicate points before other geometry checks', () => {
    expect(
      validateGoalBarPolygon([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 0 }
      ])
    ).toEqual({ valid: false, reason: 'duplicate' })
  })

  it('rejects intersections between non-adjacent edges', () => {
    expect(
      validateGoalBarPolygon([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 1, y: 0 }
      ])
    ).toEqual({ valid: false, reason: 'selfIntersection' })
  })

  it.each([
    [
      'a collinear overlap',
      [
        { x: 0, y: 0 },
        { x: 0.8, y: 0 },
        { x: 0.2, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ]
    ],
    [
      'an endpoint contact',
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0.5, y: 0 },
        { x: 0, y: 1 }
      ]
    ]
  ])('rejects %s between non-adjacent edges', (_label, points) => {
    expect(validateGoalBarPolygon(points)).toEqual({ valid: false, reason: 'selfIntersection' })
  })

  it('accepts a simple concave polygon', () => {
    expect(
      validateGoalBarPolygon([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.5, y: 0.4 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ])
    ).toEqual({ valid: true })
  })

  it('rejects an area at or below the normalized minimum', () => {
    expect(
      validateGoalBarPolygon([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: MIN_NORMALIZED_POLYGON_AREA * 2 }
      ])
    ).toEqual({ valid: false, reason: 'area' })
  })
})

describe('polygon coordinate helpers', () => {
  it('maps the same normalized custom polygon to full and segment bounds', () => {
    const polygonPoints: GoalBarPolygonPoint[] = [
      { x: 0, y: 0 },
      { x: 0.8, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ]

    expect(
      denormalizePolygonPoints(polygonPoints, { left: -50, top: -5, width: 100, height: 10 })
    ).toEqual([
      { x: -50, y: -5 },
      { x: 30, y: -5 },
      { x: 50, y: 5 },
      { x: -50, y: 5 }
    ])
    expect(
      denormalizePolygonPoints(polygonPoints, { left: 10, top: -5, width: 20, height: 10 })
    ).toEqual([
      { x: 10, y: -5 },
      { x: 26, y: -5 },
      { x: 30, y: 5 },
      { x: 10, y: 5 }
    ])
  })

  it('normalizes absolute points against their bounding box and returns the bounds', () => {
    const absolutePoints = [
      { x: 10, y: 20 },
      { x: 30, y: 20 },
      { x: 30, y: 60 },
      { x: 10, y: 60 }
    ]

    const normalized = normalizePolygonPoints(absolutePoints)

    expect(normalized).toEqual({
      points: square,
      bounds: { left: 10, top: 20, width: 20, height: 40 }
    })
    const restored = denormalizePolygonPoints(normalized.points, normalized.bounds)
    restored.forEach((point, index) => {
      expect(point.x).toBeCloseTo(absolutePoints[index].x, 12)
      expect(point.y).toBeCloseTo(absolutePoints[index].y, 12)
    })
  })

  it('does not produce non-finite values for near-zero bounding-box dimensions', () => {
    const nearZeroWidth = normalizePolygonPoints([
      { x: 2, y: 10 },
      { x: 2.0000001, y: 20 },
      { x: 2, y: 30 }
    ])
    const nearZeroHeight = normalizePolygonPoints([
      { x: 10, y: 2 },
      { x: 20, y: 2.0000001 },
      { x: 30, y: 2 }
    ])

    expect(nearZeroWidth.bounds.width).toBeCloseTo(0.0000001, 12)
    expect(nearZeroHeight.bounds.height).toBeCloseTo(0.0000001, 12)
    for (const result of [nearZeroWidth, nearZeroHeight]) {
      expect(result.points.flatMap((point) => [point.x, point.y]).every(Number.isFinite)).toBe(true)
    }
  })

  it('does not produce non-finite values for zero-width or zero-height bounds', () => {
    const zeroWidth = normalizePolygonPoints([
      { x: 2, y: 10 },
      { x: 2, y: 20 },
      { x: 2, y: 30 }
    ])
    const zeroHeight = normalizePolygonPoints([
      { x: 10, y: 2 },
      { x: 20, y: 2 },
      { x: 30, y: 2 }
    ])

    expect(zeroWidth.bounds.width).toBe(0)
    expect(zeroHeight.bounds.height).toBe(0)
    expect(zeroWidth.points.every((point) => point.x === 0)).toBe(true)
    expect(zeroHeight.points.every((point) => point.y === 0)).toBe(true)
    for (const result of [zeroWidth, zeroHeight]) {
      expect(result.points.flatMap((point) => [point.x, point.y]).every(Number.isFinite)).toBe(true)
    }
  })

  it('inserts a point immediately after the selected edge start', () => {
    const originalPoints = square.map((point) => ({ ...point }))
    const inserted = insertPointOnEdge(square, 1, { x: 1, y: 0.5 })

    expect(inserted).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.5 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ])
    expect(square).toEqual(originalPoints)
  })
})

describe('legacy polygon migration and config normalization', () => {
  it.each<[GoalBarLegacyShape, GoalBarPolygonPoint[]]>([
    [
      'trapezoid',
      [
        { x: 0, y: 0 },
        { x: 0.8, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ]
    ],
    [
      'reverseTrapezoid',
      [
        { x: 0.2, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ]
    ],
    [
      'parallelogram',
      [
        { x: 0.2, y: 0 },
        { x: 1, y: 0 },
        { x: 0.8, y: 1 },
        { x: 0, y: 1 }
      ]
    ]
  ])('migrates %s to a valid custom polygon', (shape, expectedPoints) => {
    const migrated = migrateLegacyGoalBarPolygon(shape)

    expect(migrated).toEqual({ shape: 'customPolygon', polygonPoints: expectedPoints })
    expect(validateGoalBarPolygon(migrated.polygonPoints)).toEqual({ valid: true })
  })

  it('clamps the legacy slant ratio before migration', () => {
    expect(migrateLegacyGoalBarPolygon('trapezoid', 2).polygonPoints[1].x).toBe(0.55)
    expect(migrateLegacyGoalBarPolygon('reverseTrapezoid', -1).polygonPoints[0].x).toBe(0)
  })

  it('preserves valid historical points for rectangle and unknown shapes', () => {
    expect(normalizeGoalBarPolygonConfig({ shape: 'rectangle', polygonPoints: square })).toEqual({
      shape: 'rectangle',
      polygonPoints: square
    })
    expect(normalizeGoalBarPolygonConfig({ shape: 'future-shape', polygonPoints: square })).toEqual({
      shape: 'rectangle',
      polygonPoints: square
    })
  })

  it('keeps only valid custom polygons and falls back otherwise', () => {
    expect(normalizeGoalBarPolygonConfig({ shape: 'customPolygon', polygonPoints: square })).toEqual({
      shape: 'customPolygon',
      polygonPoints: square
    })
    expect(
      normalizeGoalBarPolygonConfig({
        shape: 'customPolygon',
        polygonPoints: square.slice(0, 2)
      })
    ).toEqual({ shape: 'rectangle', polygonPoints: [] })
  })

  it.each<[GoalBarLegacyShape, GoalBarPolygonPoint[]]>([
    [
      'trapezoid',
      [
        { x: 0, y: 0 },
        { x: 0.75, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ]
    ],
    [
      'reverseTrapezoid',
      [
        { x: 0.25, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ]
    ],
    [
      'parallelogram',
      [
        { x: 0.25, y: 0 },
        { x: 1, y: 0 },
        { x: 0.75, y: 1 },
        { x: 0, y: 1 }
      ]
    ]
  ])('migrates %s through config normalization', (shape, expectedPoints) => {
    const normalized = normalizeGoalBarPolygonConfig({ shape, slantRatio: 0.25 })

    expect(normalized.shape).toBe('customPolygon')
    expect(normalized.polygonPoints).toHaveLength(4)
    expect(normalized.polygonPoints).toEqual(expectedPoints)
    expect(validateGoalBarPolygon(normalized.polygonPoints)).toEqual({ valid: true })
  })
})

describe('clipGoalBarPolygon', () => {
  it.each([
    ['leftToRight', { minX: 0, maxX: 0.5, minY: 0, maxY: 1 }],
    ['rightToLeft', { minX: 0.5, maxX: 1, minY: 0, maxY: 1 }],
    ['topToBottom', { minX: 0, maxX: 1, minY: 0, maxY: 0.5 }],
    ['bottomToTop', { minX: 0, maxX: 1, minY: 0.5, maxY: 1 }],
  ] as const)('clips normalized points %s', (direction, expected) => {
    const square = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
    const clipped = clipGoalBarPolygon(square, 0.5, direction)
    const xs = clipped.map((point) => point.x)
    const ys = clipped.map((point) => point.y)
    expect({ minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }).toEqual(expected)
  })

  it.each([
    ['left', 0, []],
    [
      'left',
      0.5,
      [
        { x: 0, y: 0 },
        { x: 0.5, y: 0 },
        { x: 0.5, y: 1 },
        { x: 0, y: 1 }
      ]
    ],
    ['left', 1, square],
    ['right', 0, []],
    [
      'right',
      0.5,
      [
        { x: 0.5, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0.5, y: 1 }
      ]
    ],
    ['right', 1, square]
  ] as const)('clips from %s at progress %s', (align, progress, expected) => {
    expect(clipGoalBarPolygon(square, 0, 1, progress, align)).toEqual(expected)
  })

  const slantedTriangle: GoalBarPolygonPoint[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0.5 },
    { x: 0, y: 1 }
  ]

  it.each<['left' | 'right', GoalBarPolygonPoint[]]>([
    [
      'left',
      [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.25 },
        { x: 0.5, y: 0.75 },
        { x: 0, y: 1 }
      ]
    ],
    [
      'right',
      [
        { x: 0.5, y: 0.25 },
        { x: 1, y: 0.5 },
        { x: 0.5, y: 0.75 }
      ]
    ]
  ])('interpolates slanted-edge intersections when clipping from %s', (align, expected) => {
    expect(validateGoalBarPolygon(slantedTriangle)).toEqual({ valid: true })
    expect(clipGoalBarPolygon(slantedTriangle, 0, 1, 0.5, align)).toEqual(expected)
  })

  const diamond: GoalBarPolygonPoint[] = [
    { x: 0.5, y: 0 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.5 }
  ]

  it.each<['left' | 'right', GoalBarPolygonPoint[]]>([
    [
      'left',
      [
        { x: 0.5, y: 0 },
        { x: 0.5, y: 1 },
        { x: 0, y: 0.5 }
      ]
    ],
    [
      'right',
      [
        { x: 0.5, y: 0 },
        { x: 1, y: 0.5 },
        { x: 0.5, y: 1 }
      ]
    ]
  ])('deduplicates existing vertices on the %s clip line', (align, expected) => {
    const clipped = clipGoalBarPolygon(diamond, 0, 1, 0.5, align)

    expect(clipped).toEqual(expected)
    expect(new Set(clipped.map((point) => `${point.x}:${point.y}`)).size).toBe(clipped.length)
  })
})
