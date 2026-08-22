import { describe, expect, it } from 'vitest'
import { resolveRotatingHandAngle, resolveRotatingHandDirectionAngle, toRotatingHandRenderAngle } from './rotatingHand.math'

describe('resolveRotatingHandAngle', () => {
  const base = {
    startAngle: 150,
    endAngle: 390,
    counterClockwise: false,
    outOfRangeBehavior: 'clamp' as const,
  }

  it('maps progress clockwise across the configured sweep', () => {
    expect(resolveRotatingHandAngle(0.5, base)).toBe(270)
  })

  it('maps progress counter-clockwise across the same sweep', () => {
    expect(resolveRotatingHandAngle(0.5, { ...base, counterClockwise: true })).toBe(30)
  })

  it('clamps finite progress to the configured endpoints', () => {
    expect(resolveRotatingHandAngle(1.4, base)).toBe(390)
    expect(resolveRotatingHandAngle(-0.2, base)).toBe(150)
  })

  it('hides out-of-range and non-finite progress when requested', () => {
    expect(resolveRotatingHandAngle(1.01, { ...base, outOfRangeBehavior: 'hide' })).toBeNull()
    expect(resolveRotatingHandAngle(Number.NaN, base)).toBeNull()
  })
})

describe('resolveRotatingHandDirectionAngle', () => {
  it.each([
    [0, 270],
    [90, 0],
    [180, 90],
    [270, 180],
    [450, 0],
  ])('maps bearing %d to screen angle %d with north at 12 o’clock', (bearing, angle) => {
    expect(resolveRotatingHandDirectionAngle(bearing, {
      northAngle: 270,
      counterClockwise: false,
    })).toBe(angle)
  })

  it('supports counter-clockwise bearings and rejects non-finite values', () => {
    expect(resolveRotatingHandDirectionAngle(90, { northAngle: 270, counterClockwise: true })).toBe(180)
    expect(resolveRotatingHandDirectionAngle(Number.NaN, { northAngle: 270, counterClockwise: false })).toBeNull()
  })
})

describe('toRotatingHandRenderAngle', () => {
  it.each([
    [0, 90],
    [90, 180],
    [180, 270],
    [270, 0],
  ])('renders configured %d degrees at bitmap rotation %d degrees', (configured, rendered) => {
    expect(toRotatingHandRenderAngle(configured)).toBe(rendered)
  })
})
