import { describe, expect, it } from 'vitest'
import {
  boundsFromCenter,
  intersectionArea,
  isBoundsInsideCircle,
  unionBounds,
  type DesignGeometry,
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
