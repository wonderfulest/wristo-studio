import { describe, expect, it } from 'vitest'
import { createGoalBarGradientSpec } from './goalBar.gradient'

describe('goalBar gradient', () => {
  it('runs from left to right for left-aligned progress', () => {
    const spec = createGoalBarGradientSpec({
      enabled: true,
      startColor: '#000000',
      endColor: '#FFFFFF',
      progressAlign: 'left',
      width: 80,
    })

    expect(spec?.coords).toEqual({ x1: 0, y1: 0, x2: 80, y2: 0 })
    expect(spec?.colorStops).toEqual([
      { offset: 0, color: '#000000' },
      { offset: 1, color: '#ffffff' },
    ])
  })

  it('runs from right to left for right-aligned progress', () => {
    const spec = createGoalBarGradientSpec({
      enabled: true,
      startColor: '#000000',
      endColor: '#FFFFFF',
      progressAlign: 'right',
      width: 80,
    })

    expect(spec?.coords).toEqual({ x1: 80, y1: 0, x2: 0, y2: 0 })
  })

  it('uses the requested slice of the overall gradient', () => {
    const spec = createGoalBarGradientSpec({
      enabled: true,
      startColor: '#000000',
      endColor: '#FFFFFF',
      progressAlign: 'left',
      width: 20,
      startRatio: 0.25,
      endRatio: 0.5,
    })

    expect(spec?.colorStops).toEqual([
      { offset: 0, color: '#404040' },
      { offset: 1, color: '#808080' },
    ])
  })

  it('falls back to a solid fill when disabled or invalid', () => {
    expect(createGoalBarGradientSpec({
      enabled: false,
      startColor: '#000000',
      endColor: '#FFFFFF',
      progressAlign: 'left',
      width: 80,
    })).toBeNull()
    expect(createGoalBarGradientSpec({
      enabled: true,
      startColor: 'transparent',
      endColor: '#FFFFFF',
      progressAlign: 'left',
      width: 80,
    })).toBeNull()
  })
})
