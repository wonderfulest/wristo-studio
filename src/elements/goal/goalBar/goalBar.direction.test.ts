import { describe, expect, it } from 'vitest'
import {
  getDefaultGoalBarDirection,
  getGoalBarOrientationPatch,
  getGoalBarProgressBounds,
  normalizeGoalBarDirection,
  resolveGoalBarDirection,
  resolveGoalBarOrientation,
} from './goalBar.direction'

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

  it.each([
    ['leftToRight', 'horizontal'],
    ['rightToLeft', 'horizontal'],
    ['bottomToTop', 'vertical'],
    ['topToBottom', 'vertical'],
  ] as const)('derives %s orientation', (direction, orientation) => {
    expect(resolveGoalBarOrientation(direction)).toBe(orientation)
  })

  it('uses an axis-specific default direction', () => {
    expect(getDefaultGoalBarDirection('horizontal')).toBe('leftToRight')
    expect(getDefaultGoalBarDirection('vertical')).toBe('bottomToTop')
  })

  it('swaps dimensions when changing from horizontal to vertical', () => {
    expect(getGoalBarOrientationPatch('horizontal', 'vertical', 200, 20)).toEqual({
      orientation: 'vertical',
      progressDirection: 'bottomToTop',
      width: 20,
      height: 200,
    })
  })

  it('swaps dimensions when changing from vertical to horizontal', () => {
    expect(getGoalBarOrientationPatch('vertical', 'horizontal', 20, 200)).toEqual({
      orientation: 'horizontal',
      progressDirection: 'leftToRight',
      width: 200,
      height: 20,
    })
  })

  it('does not update when selecting the current orientation', () => {
    expect(getGoalBarOrientationPatch('horizontal', 'horizontal', 200, 20)).toBeNull()
  })
})
