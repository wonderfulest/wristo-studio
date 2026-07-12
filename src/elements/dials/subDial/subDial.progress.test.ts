import { describe, expect, it } from 'vitest'
import { resolveSubDialProgress, type SubDialProgressSourceMeta } from './subDial.progress'

const source = (overrides: Partial<SubDialProgressSourceMeta> = {}): SubDialProgressSourceMeta => ({
  value: 25,
  displayValue: '25',
  icon: 'steps',
  label: 'Steps',
  unit: 'steps',
  goal: 100,
  min: null,
  max: null,
  ...overrides
})

describe('resolveSubDialProgress', () => {
  it('uses a positive goal in auto mode', () => {
    expect(resolveSubDialProgress(source(), { mode: 'auto' })).toMatchObject({
      mode: 'goal',
      goal: 100,
      percentage: 25,
      valid: true
    })
  })

  it('uses a valid range when auto mode has no valid goal', () => {
    const result = resolveSubDialProgress(source({ value: 70, goal: null, min: 40, max: 180 }), { mode: 'auto' })
    expect(result.mode).toBe('range')
    expect(result.percentage).toBeCloseTo(21.4285714286)
    expect(result.valid).toBe(true)
  })

  it('falls back to a valid range in auto mode when the goal is not positive', () => {
    expect(resolveSubDialProgress(source({ goal: 0, min: 0, max: 50 }), { mode: 'auto' })).toMatchObject({
      mode: 'range',
      percentage: 50,
      valid: true
    })
  })

  it('rejects a reversed range', () => {
    expect(resolveSubDialProgress(source({ goal: null, min: 100, max: 20 }), { mode: 'auto' })).toMatchObject({
      mode: 'none',
      percentage: null,
      valid: false
    })
  })

  it('uses a custom range and ignores the source goal', () => {
    expect(resolveSubDialProgress(source({ value: 50, goal: 10 }), { mode: 'custom', customMin: 40, customMax: 60 })).toMatchObject({
      mode: 'range',
      goal: null,
      min: 40,
      max: 60,
      percentage: 50,
      valid: true
    })
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])('rejects non-finite values (%s)', (value) => {
    expect(resolveSubDialProgress(source({ value }), { mode: 'goal' })).toMatchObject({ valid: false, percentage: null, mode: 'none' })
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid explicit goals (%s)', (goal) => {
    const result = resolveSubDialProgress(source({ goal, min: 0, max: 100 }), { mode: 'goal' })
    expect(result).toMatchObject({ valid: false, percentage: null, mode: 'none' })
  })

  it('does not fall back from explicit range mode to a valid goal', () => {
    expect(resolveSubDialProgress(source({ goal: 100, min: 20, max: 20 }), { mode: 'range' })).toMatchObject({
      valid: false,
      percentage: null,
      mode: 'none'
    })
  })

  it('keeps percentages outside zero to one hundred unclamped', () => {
    expect(resolveSubDialProgress(source({ value: 150 }), { mode: 'goal' }).percentage).toBe(150)
    expect(resolveSubDialProgress(source({ value: 20, goal: null, min: 40, max: 60 }), { mode: 'range' }).percentage).toBe(-100)
  })

  it('preserves display metadata and value when progress is invalid', () => {
    const result = resolveSubDialProgress(source({ value: 42, displayValue: '42 kcal', icon: 'flame', label: 'Calories', unit: 'kcal', goal: null }), { mode: 'goal' })
    expect(result).toEqual({
      value: 42,
      displayValue: '42 kcal',
      icon: 'flame',
      label: 'Calories',
      unit: 'kcal',
      mode: 'none',
      goal: null,
      min: null,
      max: null,
      percentage: null,
      valid: false
    })
  })

  it('rejects non-finite range bounds and custom bounds', () => {
    expect(resolveSubDialProgress(source({ goal: null, min: Number.NaN, max: 100 }), { mode: 'range' }).valid).toBe(false)
    expect(resolveSubDialProgress(source(), { mode: 'custom', customMin: 0, customMax: Number.POSITIVE_INFINITY }).valid).toBe(false)
  })
})
