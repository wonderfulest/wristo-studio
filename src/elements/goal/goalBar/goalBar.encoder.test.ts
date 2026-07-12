import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GoalBarElementConfig } from '@/types/elements/goal'
import { decodeGoalBar, encodeGoalBar } from './goalBar.encoder'

const square = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 }
]

function createConfig(overrides: Record<string, unknown> = {}): GoalBarElementConfig {
  return {
    id: 'goal-bar-test',
    eleType: 'goalBar',
    left: 10,
    top: 20,
    width: 200,
    height: 20,
    color: '#00FF00',
    bgColor: '#333333',
    variant: 'continuous',
    segments: 10,
    gap: 2,
    borderRadius: 5,
    progress: 0.5,
    padding: 2,
    originX: 'center',
    originY: 'center',
    borderWidth: 0,
    borderColor: '#FFFFFF',
    goalProperty: 'goal_1',
    progressAlign: 'left',
    ...overrides
  } as unknown as GoalBarElementConfig
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('goalBar encoder compatibility', () => {
  it.each([undefined, 'rectangle'])('decodes legacy shape %s as rectangle', (shape) => {
    const decoded = decodeGoalBar(createConfig({ shape }))

    expect(decoded.shape).toBe('rectangle')
    expect(decoded.polygonPoints).toEqual([])
  })

  it('round-trips valid custom polygon points without sharing input references', () => {
    const decoded = decodeGoalBar(createConfig({ shape: 'customPolygon', polygonPoints: square }))
    const encoded = encodeGoalBar(decoded)

    expect(decoded.shape).toBe('customPolygon')
    expect(decoded.polygonPoints).toEqual(square)
    expect(decoded.polygonPoints).not.toBe(square)
    expect(encoded.shape).toBe('customPolygon')
    expect(encoded.polygonPoints).toEqual(square)
    expect(encoded.polygonPoints).not.toBe(decoded.polygonPoints)
  })

  it.each([
    [
      'trapezoid',
      [
        { x: 0, y: 0 },
        { x: 0.75, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ]
    ],
    [
      'reverseTrapezoid',
      [
        { x: 0.25, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ]
    ],
    [
      'parallelogram',
      [
        { x: 0.25, y: 0 },
        { x: 1, y: 0 },
        { x: 0.75, y: 1 },
        { x: 0, y: 1 }
      ]
    ]
  ])('migrates legacy %s presets to persisted custom polygons', (shape, expectedPoints) => {
    const decoded = decodeGoalBar(createConfig({ shape, slantRatio: 0.25 }))
    const encoded = encodeGoalBar({
      id: 'goal-bar-test',
      __element: {
        config: createConfig({ shape, slantRatio: 0.25 })
      }
    } as any)

    expect(decoded.shape).toBe('customPolygon')
    expect(decoded.polygonPoints).toEqual(expectedPoints)
    expect(encoded.shape).toBe('customPolygon')
    expect(encoded.polygonPoints).toEqual(expectedPoints)
    expect(encoded).not.toHaveProperty('slantRatio')
    expect(encoded.shape).not.toBe(shape)
  })

  it.each([
    ['fewer than three points', square.slice(0, 2)],
    [
      'out-of-range coordinates',
      [
        { x: 0, y: 0 },
        { x: 1.1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ]
    ],
    [
      'a concave polygon',
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ]
    ]
  ])('falls back and warns when decoding customPolygon with %s', (_case, polygonPoints) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const decoded = decodeGoalBar(createConfig({ shape: 'customPolygon', polygonPoints }))

    expect(decoded.shape).toBe('rectangle')
    expect(decoded.polygonPoints).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('[GoalBar] Invalid polygonPoints; falling back to rectangle', { id: 'goal-bar-test' })
  })

  it('falls back and warns once when encoding an invalid persisted custom polygon', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const encoded = encodeGoalBar({
      id: 'goal-bar-test',
      __element: {
        config: createConfig({
          shape: 'customPolygon',
          polygonPoints: square.slice(0, 2)
        })
      }
    } as any)

    expect(encoded.shape).toBe('rectangle')
    expect(encoded.polygonPoints).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('[GoalBar] Invalid polygonPoints; falling back to rectangle', { id: 'goal-bar-test' })
  })

  it('preserves valid historical polygon points while the active shape is rectangle', () => {
    const decoded = decodeGoalBar(createConfig({ shape: 'rectangle', polygonPoints: square }))
    const encoded = encodeGoalBar(decoded)

    expect(decoded.shape).toBe('rectangle')
    expect(decoded.polygonPoints).toEqual(square)
    expect(encoded.shape).toBe('rectangle')
    expect(encoded.polygonPoints).toEqual(square)
  })

  it('does not warn for rectangle or unknown persisted shapes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    decodeGoalBar(createConfig({ shape: 'rectangle', polygonPoints: square }))
    decodeGoalBar(createConfig({ shape: 'futureShape', polygonPoints: square }))

    expect(warn).not.toHaveBeenCalled()
  })

  it('prefers the live polygon config over stale widget config values', () => {
    const livePolygonPoints = [
      { x: 0.1, y: 0 },
      { x: 1, y: 0 },
      { x: 0.9, y: 1 },
      { x: 0, y: 1 }
    ]
    const encoded = encodeGoalBar({
      id: 'goal-bar-test',
      shape: 'customPolygon',
      polygonPoints: livePolygonPoints,
      slantRatio: 0.35,
      __element: {
        config: createConfig({
          shape: 'rectangle',
          polygonPoints: square,
          slantRatio: 0.1
        })
      }
    } as any)

    expect(encoded.shape).toBe('customPolygon')
    expect(encoded.polygonPoints).toEqual(livePolygonPoints)
    expect(encoded.polygonPoints).not.toBe(livePolygonPoints)
    expect(encoded).not.toHaveProperty('slantRatio')
  })

  it('prefers the live goalProperty over the stale widget config value', () => {
    const encoded = encodeGoalBar({
      id: 'goal-bar-test',
      goalProperty: 'goal_live',
      __element: {
        config: createConfig({ goalProperty: 'goal_stale' })
      }
    } as any)

    expect(encoded.goalProperty).toBe('goal_live')
  })

  it('round-trips gradient foreground settings', () => {
    const decoded = decodeGoalBar(createConfig({
      gradientEnabled: true,
      gradientStartColor: '#112233',
      gradientEndColor: '#AABBCC',
    }))
    const encoded = encodeGoalBar(decoded)

    expect(encoded.gradientEnabled).toBe(true)
    expect(encoded.gradientStartColor).toBe('#112233')
    expect(encoded.gradientEndColor).toBe('#AABBCC')
  })

  it('defaults legacy gradient settings to the foreground color', () => {
    const decoded = decodeGoalBar(createConfig({ color: '#123456' }))

    expect(decoded.gradientEnabled).toBe(false)
    expect(decoded.gradientStartColor).toBe('#123456')
    expect(decoded.gradientEndColor).toBe('#123456')
  })
})
