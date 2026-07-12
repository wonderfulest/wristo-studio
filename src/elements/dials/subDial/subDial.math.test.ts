import { describe, expect, it } from 'vitest'
import { clampPivot, normalizeSubDialValue, resolveSubDialAngle } from './subDial.math'

describe('subDial math', () => {
  it('normalizes percentage and custom ranges', () => {
    expect(normalizeSubDialValue(25, 0, 100, 'clamp')).toBe(0.25)
    expect(normalizeSubDialValue(120, 20, 220, 'clamp')).toBe(0.5)
  })

  it('supports clamp and hide for out-of-range values', () => {
    expect(normalizeSubDialValue(150, 0, 100, 'clamp')).toBe(1)
    expect(normalizeSubDialValue(150, 0, 100, 'hide')).toBeNull()
  })

  it('supports wrapped clockwise and counter-clockwise sweeps', () => {
    expect(resolveSubDialAngle(0.5, 150, 390, false, 0)).toBe(270)
    expect(resolveSubDialAngle(0.5, 30, 150, true, 5)).toBe(-85)
  })

  it('rejects invalid ranges and values', () => {
    expect(normalizeSubDialValue(Number.NaN, 0, 100, 'clamp')).toBeNull()
    expect(normalizeSubDialValue(10, 10, 10, 'clamp')).toBeNull()
  })

  it('clamps pointer pivots to normalized coordinates', () => {
    expect(clampPivot(-1)).toBe(0)
    expect(clampPivot(1.4)).toBe(1)
    expect(clampPivot(Number.NaN)).toBe(0.5)
  })
})
