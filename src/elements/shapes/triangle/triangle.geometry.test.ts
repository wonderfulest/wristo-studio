import { describe, expect, it } from 'vitest'
import { buildTriangleCanvasGeometry } from './triangle.geometry'

describe('triangle geometry', () => {
  it('keeps the apex at top-center and the base on both bottom corners', () => {
    expect(buildTriangleCanvasGeometry(120, 80)).toEqual({
      width: 120,
      height: 80,
      points: [
        { x: 60, y: 0 },
        { x: 120, y: 80 },
        { x: 0, y: 80 },
      ],
      pathOffset: { x: 60, y: 40 },
    })
  })

  it('normalizes invalid dimensions without breaking the isosceles shape', () => {
    expect(buildTriangleCanvasGeometry(Number.NaN, -10)).toMatchObject({
      width: 1,
      height: 1,
      points: [
        { x: 0.5, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    })
  })
})
