import { describe, expect, it } from 'vitest'
import * as geometry from './gridLines.geometry'

describe('Grid Lines geometry', () => {
  it('builds centered horizontal segments at the configured spacing', async () => {
    expect(geometry.buildGridLineSegments(200, 80, 20)).toEqual([
      [-100, -40, 100, -40],
      [-100, -20, 100, -20],
      [-100, 0, 100, 0],
      [-100, 20, 100, 20],
      [-100, 40, 100, 40],
    ])
  })

  it('bakes Fabric scale into positive dimensions', () => {
    const normalizeGridLinesSize = (geometry as any).normalizeGridLinesSize

    expect(normalizeGridLinesSize).toBeTypeOf('function')
    expect(normalizeGridLinesSize(200, 80, 1.5, 0.5)).toEqual({
      width: 300,
      height: 40,
    })
  })
})
