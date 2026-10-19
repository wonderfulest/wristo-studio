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
  it('centers visible glyphs rather than unequal line-box padding for labels and data', () => {
    for (const [eleType, lineHeight, inkTop, inkBottom] of [['label', 44, 8, 31], ['data', 53, 9, 37]] as const) {
      const pixels = new Uint8ClampedArray(2 * lineHeight * 2 * 4)
      for (let y = inkTop * 2; y < inkBottom * 2; y++) pixels[(y * 2) * 4 + 3] = 255
      const element = makeElement({ eleType, height: lineHeight, toCanvasElement: () => ({
        width: 2, height: lineHeight * 2,
        getContext: () => ({ getImageData: () => ({ data: pixels }) }),
      }) })
      const measurement = measureStudioLayoutMember(element, 'active')
      measurement.placeAtVisualCenter(100, 400)
      expect(element.top - lineHeight / 2 + (inkTop + inkBottom) / 2).toBe(400)
      expect(measurement.height).toBe(inkBottom - inkTop)
    }
  })
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
