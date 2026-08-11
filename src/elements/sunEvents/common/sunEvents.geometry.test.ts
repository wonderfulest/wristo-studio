import { describe, expect, it } from 'vitest'
import { arcIndicatorTransform, lineIndicatorTransform } from './sunEvents.geometry'

describe('Sun Events indicator geometry', () => {
  it('positions and orients an Arc indicator', () => {
    expect(arcIndicatorTransform({
      fraction: 0.25,
      centerX: 100,
      centerY: 100,
      radius: 50,
      radialOffset: 5,
      startAngle: -90,
      angleRange: 360,
      counterClockwise: false,
      orientation: 'outward',
    })).toEqual({ x: 155, y: 100, angle: 90 })

    expect(arcIndicatorTransform({
      fraction: 0.25,
      centerX: 100,
      centerY: 100,
      radius: 50,
      radialOffset: 0,
      startAngle: -90,
      angleRange: 360,
      counterClockwise: false,
      orientation: 'inward',
    }).angle).toBe(270)
  })

  it('keeps the original SVG direction when requested', () => {
    expect(arcIndicatorTransform({
      fraction: 0,
      centerX: 0,
      centerY: 0,
      radius: 10,
      radialOffset: 0,
      startAngle: -90,
      angleRange: 360,
      counterClockwise: false,
      orientation: 'fixed',
    })).toEqual({ x: 0, y: -10, angle: 0 })
  })

  it('maps a Line indicator from left to right with a perpendicular offset', () => {
    expect(lineIndicatorTransform({ fraction: 0.25, length: 100, offset: 10 })).toEqual({ x: -25, y: 10 })
  })
})
