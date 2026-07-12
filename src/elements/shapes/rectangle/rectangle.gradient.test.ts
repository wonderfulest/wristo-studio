import { describe, expect, it } from 'vitest'
import { createRectangleGradientFill, createRectangleGradientSpec } from './rectangle.gradient'

describe('rectangle gradient', () => {
  it.each([
    ['leftToRight', { x1: 0, y1: 0, x2: 120, y2: 0 }],
    ['rightToLeft', { x1: 120, y1: 0, x2: 0, y2: 0 }],
    ['topToBottom', { x1: 0, y1: 0, x2: 0, y2: 60 }],
    ['bottomToTop', { x1: 0, y1: 60, x2: 0, y2: 0 }],
  ] as const)('maps %s to Fabric coordinates', (direction, coords) => {
    expect(createRectangleGradientSpec({
      enabled: true,
      startColor: '#112233',
      endColor: '#AABBCC',
      direction,
      width: 120,
      height: 60,
    })).toEqual({
      coords,
      colorStops: [
        { offset: 0, color: '#112233' },
        { offset: 1, color: '#AABBCC' },
      ],
    })
  })

  it('falls back to left-to-right for an unknown direction', () => {
    const spec = createRectangleGradientSpec({
      enabled: true,
      startColor: '#112233',
      endColor: '#AABBCC',
      direction: 'diagonal' as any,
      width: 120,
      height: 60,
    })
    expect(spec?.coords).toEqual({ x1: 0, y1: 0, x2: 120, y2: 0 })
  })

  it('creates a pixel-based Fabric linear gradient', () => {
    const fill = createRectangleGradientFill({
      enabled: true,
      startColor: '#112233',
      endColor: '#AABBCC',
      direction: 'topToBottom',
      width: 120,
      height: 60,
    })
    expect(fill?.type).toBe('linear')
    expect(fill?.gradientUnits).toBe('pixels')
    expect(fill?.coords).toEqual({ x1: 0, y1: 0, x2: 0, y2: 60 })
  })

  it('returns null when disabled, colors are invalid, or dimensions are empty', () => {
    expect(createRectangleGradientSpec({
      enabled: false, startColor: '#000000', endColor: '#FFFFFF',
      direction: 'leftToRight', width: 10, height: 10,
    })).toBeNull()
    expect(createRectangleGradientSpec({
      enabled: true, startColor: 'transparent', endColor: '#FFFFFF',
      direction: 'leftToRight', width: 10, height: 10,
    })).toBeNull()
    expect(createRectangleGradientSpec({
      enabled: true, startColor: '#000000', endColor: '#FFFFFF',
      direction: 'leftToRight', width: 0, height: 10,
    })).toBeNull()
  })
})
