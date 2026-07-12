import { describe, expect, it } from 'vitest'
import { createRectangleGradientSpec } from '../rectangle/rectangle.gradient'

describe('circle gradient', () => {
  it.each([
    ['leftToRight', { x1: 0, y1: 0, x2: 80, y2: 0 }],
    ['rightToLeft', { x1: 80, y1: 0, x2: 0, y2: 0 }],
    ['topToBottom', { x1: 0, y1: 0, x2: 0, y2: 80 }],
    ['bottomToTop', { x1: 0, y1: 80, x2: 0, y2: 0 }],
  ] as const)('maps %s across the full diameter', (direction, coords) => {
    expect(createRectangleGradientSpec({
      enabled: true,
      startColor: '#112233',
      endColor: '#AABBCC',
      direction,
      width: 80,
      height: 80,
    })?.coords).toEqual(coords)
  })
})
