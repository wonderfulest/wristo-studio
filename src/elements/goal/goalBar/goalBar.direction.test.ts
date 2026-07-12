import { describe, expect, it } from 'vitest'
import { getGoalBarProgressBounds, normalizeGoalBarDirection, resolveGoalBarDirection } from './goalBar.direction'

describe('goalBar direction', () => {
  it.each([
    ['leftToRight', 'horizontal', false],
    ['rightToLeft', 'horizontal', true],
    ['bottomToTop', 'vertical', true],
    ['topToBottom', 'vertical', false],
  ] as const)('maps %s to its axis model', (direction, axis, reversed) => {
    expect(resolveGoalBarDirection(direction)).toEqual({ direction, axis, reversed })
  })

  it('migrates legacy values without overriding a valid new value', () => {
    expect(normalizeGoalBarDirection(undefined, 'right')).toBe('rightToLeft')
    expect(normalizeGoalBarDirection(undefined, 'left')).toBe('leftToRight')
    expect(normalizeGoalBarDirection('bottomToTop', 'right')).toBe('bottomToTop')
  })

  it('falls back safely for unknown new direction values', () => {
    expect(normalizeGoalBarDirection('diagonal', 'right')).toBe('leftToRight')
  })

  it.each([
    ['leftToRight', { left: 0, top: 0, width: 25, height: 40 }],
    ['rightToLeft', { left: 75, top: 0, width: 25, height: 40 }],
    ['topToBottom', { left: 0, top: 0, width: 100, height: 10 }],
    ['bottomToTop', { left: 0, top: 30, width: 100, height: 10 }],
  ] as const)('calculates %s progress bounds', (direction, expected) => {
    expect(getGoalBarProgressBounds(100, 40, 0.25, direction)).toEqual(expected)
  })
})
