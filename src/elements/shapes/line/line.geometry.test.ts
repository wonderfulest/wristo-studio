import { describe, expect, it } from 'vitest'
import { snapLineEndpointToAxis } from './line.geometry'

describe('line axis snapping', () => {
  it.each([
    {
      name: 'near the positive horizontal axis',
      start: [0, 0],
      end: [100, 3],
      expected: { x: 100, y: 0 },
    },
    {
      name: 'near the negative horizontal axis',
      start: [0, 0],
      end: [-100, 3],
      expected: { x: -100, y: 0 },
    },
    {
      name: 'near the positive vertical axis',
      start: [0, 0],
      end: [3, 100],
      expected: { x: 0, y: 100 },
    },
    {
      name: 'near the negative vertical axis',
      start: [0, 0],
      end: [3, -100],
      expected: { x: 0, y: -100 },
    },
  ])('snaps $name exactly onto the axis', ({ start, end, expected }) => {
    expect(snapLineEndpointToAxis(start[0], start[1], end[0], end[1])).toEqual(expected)
  })

  it.each([
    {
      name: 'a line just outside the horizontal threshold',
      end: [100, 4],
    },
    {
      name: 'a line just outside the vertical threshold',
      end: [4, 100],
    },
    {
      name: 'a diagonal line',
      end: [100, 100],
    },
  ])('preserves $name', ({ end }) => {
    expect(snapLineEndpointToAxis(0, 0, end[0], end[1])).toEqual({ x: end[0], y: end[1] })
  })

  it('preserves a zero-length line', () => {
    expect(snapLineEndpointToAxis(12, 34, 12, 34)).toEqual({ x: 12, y: 34 })
  })
})
