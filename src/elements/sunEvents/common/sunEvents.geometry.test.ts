import { describe, expect, it } from 'vitest'
import {
  arcIndicatorTransform,
  curveIndicatorTransform,
  curveQuadraticPieces,
  lineIndicatorTransform,
} from './sunEvents.geometry'

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

  it('maps the fixed symmetric mountain through left, peak, and right', () => {
    expect(curveIndicatorTransform({
      fraction: 0,
      width: 200,
      height: 80,
      normalOffset: 0,
      orientation: 'fixed',
    })).toEqual({ x: -100, y: 40, angle: 0 })
    expect(curveIndicatorTransform({
      fraction: 0.5,
      width: 200,
      height: 80,
      normalOffset: 0,
      orientation: 'tangent',
    })).toEqual({ x: 0, y: -40, angle: 0 })
    expect(curveIndicatorTransform({
      fraction: 1,
      width: 200,
      height: 80,
      normalOffset: 0,
      orientation: 'fixed',
    })).toEqual({ x: 100, y: 40, angle: 0 })

    const morning = curveIndicatorTransform({
      fraction: 0.25,
      width: 200,
      height: 80,
      normalOffset: 0,
      orientation: 'tangent',
    })
    const evening = curveIndicatorTransform({
      fraction: 0.75,
      width: 200,
      height: 80,
      normalOffset: 0,
      orientation: 'tangent',
    })
    expect(morning.x).toBe(-evening.x)
    expect(morning.y).toBe(evening.y)
    expect(morning.angle).toBe(-evening.angle)
  })

  it('applies positive normal offset away from the baseline', () => {
    expect(curveIndicatorTransform({
      fraction: 0.5,
      width: 200,
      height: 80,
      normalOffset: 10,
      orientation: 'fixed',
    })).toEqual({ x: 0, y: -50, angle: 0 })
  })

  it('splits colored ranges at the fixed center join', () => {
    const pieces = curveQuadraticPieces(0.4, 0.6, 200, 80)
    expect(pieces).toHaveLength(2)
    expect(pieces[0].end).toEqual({ x: 0, y: -40 })
    expect(pieces[1].start).toEqual({ x: 0, y: -40 })
  })
})
