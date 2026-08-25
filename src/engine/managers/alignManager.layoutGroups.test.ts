// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { calculateAlignedRectOffsets } from './alignManager'

describe('layout group atomic alignment geometry', () => {
  it('calculates left, center, and right deltas from actual group bounds', () => {
    const rects = [
      { left: 10, top: 10, width: 20, height: 10 },
      { left: 40, top: 20, width: 40, height: 10 },
    ]

    expect(calculateAlignedRectOffsets(rects, 'left').map((item) => item.dx)).toEqual([0, -30])
    expect(calculateAlignedRectOffsets(rects, 'center').map((item) => item.dx)).toEqual([25, -15])
    expect(calculateAlignedRectOffsets(rects, 'right').map((item) => item.dx)).toEqual([50, 0])
  })
})
