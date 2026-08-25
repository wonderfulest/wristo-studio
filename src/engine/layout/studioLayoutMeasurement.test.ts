import { describe, expect, it } from 'vitest'
import { measureStudioLayoutMember } from './studioLayoutMeasurement'

const makeElement = (overrides: Record<string, unknown> = {}) => {
  const element: any = {
    id: 'element-1',
    eleType: 'data',
    text: '100',
    left: 20,
    top: 30,
    topBase: 36,
    visible: true,
    width: 40,
    height: 20,
    set(patch: string | Record<string, unknown>, value?: unknown) {
      if (typeof patch === 'string') this[patch] = value
      else Object.assign(this, patch)
    },
    setCoords() {},
    getBoundingRect() {
      return { left: this.left - this.width / 2, top: this.top - this.height / 2, width: this.width, height: this.height }
    },
    ...overrides,
  }
  return element
}

describe('measureStudioLayoutMember', () => {
  it('excludes empty text but keeps visible placeholder text', () => {
    expect(measureStudioLayoutMember(makeElement({ text: '' }), 'active').participates).toBe(false)
    expect(measureStudioLayoutMember(makeElement({ text: '--' }), 'active')).toMatchObject({
      participates: true,
      width: 40,
      height: 20,
    })
  })

  it('excludes hidden members and unsupported element types', () => {
    expect(measureStudioLayoutMember(makeElement({ visible: false }), 'active').participates).toBe(false)
    expect(measureStudioLayoutMember(makeElement({ eleType: 'line' }), 'active').participates).toBe(false)
  })

  it('places any origin at the requested visual center and preserves baseline delta', () => {
    const element = makeElement()
    const measurement = measureStudioLayoutMember(element, 'active')
    measurement.placeAtVisualCenter(100, 80)

    expect(element.left).toBe(100)
    expect(element.top).toBe(80)
    expect(element.topBase).toBe(86)
  })

  it('uses scaled image bounds as its actual dimensions', () => {
    const image = makeElement({ eleType: 'image', text: undefined, width: 24, height: 18 })
    expect(measureStudioLayoutMember(image, 'active')).toMatchObject({
      participates: true,
      width: 24,
      height: 18,
    })
  })
})
