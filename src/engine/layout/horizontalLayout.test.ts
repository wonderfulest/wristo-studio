import { describe, expect, it } from 'vitest'
import { layoutHorizontalGroup } from './horizontalLayout'

describe('layoutHorizontalGroup', () => {
  it.each([
    ['left', 100, 100, 142],
    ['center', 100, 79, 121],
    ['right', 100, 58, 100],
  ] as const)('keeps the %s anchor fixed', (originX, anchor, expectedLeft, expectedRight) => {
    const result = layoutHorizontalGroup({
      left: anchor,
      top: 40,
      originX,
      members: [
        { elementId: 'data', width: 30, height: 20, participates: true, gapBefore: 9, offsetY: 0 },
        { elementId: 'unit', width: 10, height: 12, participates: true, gapBefore: 2, offsetY: 3 },
      ],
    })

    expect(result).toMatchObject({
      left: expectedLeft,
      right: expectedRight,
      width: 42,
      members: [
        { elementId: 'data', left: expectedLeft, centerX: expectedLeft + 15, centerY: 40 },
        { elementId: 'unit', left: expectedLeft + 32, centerX: expectedLeft + 37, centerY: 43 },
      ],
    })
  })

  it('collapses hidden and empty members and uses the next visible member gap', () => {
    const result = layoutHorizontalGroup({
      left: 10.5,
      top: 20.25,
      originX: 'left',
      members: [
        { elementId: 'empty', width: 20, height: 10, participates: false, gapBefore: 99, offsetY: 0 },
        { elementId: 'data', width: 12.5, height: 10, participates: true, gapBefore: 7, offsetY: 0 },
        { elementId: 'hidden', width: 50, height: 10, participates: false, gapBefore: 8, offsetY: 0 },
        { elementId: 'unit', width: 3.5, height: 8, participates: true, gapBefore: 1.25, offsetY: -2 },
      ],
    })

    expect(result.width).toBe(17.25)
    expect(result.members.map((member) => member.elementId)).toEqual(['data', 'unit'])
    expect(result.members[0].left).toBe(10.5)
    expect(result.members[1]).toMatchObject({ left: 24.25, centerY: 18.25 })
  })

  it('excludes non-positive and non-finite measurements', () => {
    const result = layoutHorizontalGroup({
      left: 50,
      top: 25,
      originX: 'center',
      members: [
        { elementId: 'zero', width: 0, height: 10, participates: true, gapBefore: 0, offsetY: 0 },
        { elementId: 'nan', width: Number.NaN, height: 10, participates: true, gapBefore: 0, offsetY: 0 },
      ],
    })

    expect(result).toEqual({ left: 50, right: 50, top: 25, bottom: 25, width: 0, height: 0, members: [] })
  })
})
