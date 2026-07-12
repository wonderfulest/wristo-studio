import { describe, expect, it } from 'vitest'
import { decodeRectangle, encodeRectangle } from './rectangle.encoder'

function rectangle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rectangle-test', eleType: 'rectangle', left: 10, top: 20,
    width: 100, height: 50, fill: '#123456', stroke: '#FFFFFF',
    strokeWidth: 2, opacity: 1, rx: 5, ry: 5,
    originX: 'center', originY: 'center',
    ...overrides,
  } as any
}

describe('rectangle encoder gradient fields', () => {
  it('round-trips gradient settings', () => {
    const encoded = encodeRectangle(rectangle({
      gradientEnabled: true,
      gradientStartColor: '#112233',
      gradientEndColor: '#AABBCC',
      gradientDirection: 'bottomToTop',
    }))
    expect(encoded).toMatchObject({
      gradientEnabled: true,
      gradientStartColor: '#112233',
      gradientEndColor: '#AABBCC',
      gradientDirection: 'bottomToTop',
    })
    expect(decodeRectangle(encoded)).toMatchObject({
      gradientEnabled: true,
      gradientStartColor: '#112233',
      gradientEndColor: '#AABBCC',
      gradientDirection: 'bottomToTop',
    })
  })

  it('defaults legacy rectangles to a disabled left-to-right gradient using fill', () => {
    expect(decodeRectangle(encodeRectangle(rectangle()))).toMatchObject({
      gradientEnabled: false,
      gradientStartColor: '#123456',
      gradientEndColor: '#123456',
      gradientDirection: 'leftToRight',
    })
  })
})
