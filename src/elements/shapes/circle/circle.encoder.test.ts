import { beforeAll, describe, expect, it } from 'vitest'

let decodeCircle: typeof import('./circle.encoder').decodeCircle
let encodeCircle: typeof import('./circle.encoder').encodeCircle

beforeAll(async () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage })
  ;({ decodeCircle, encodeCircle } = await import('./circle.encoder'))
})

function circle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'circle-test',
    eleType: 'circle',
    left: 10,
    top: 20,
    radius: 40,
    fill: '#123456',
    solidFill: '#123456',
    stroke: '#FFFFFF',
    strokeWidth: 2,
    opacity: 1,
    originX: 'center',
    originY: 'center',
    ...overrides,
  } as any
}

describe('circle encoder gradient fields', () => {
  it('round-trips gradient settings', () => {
    const encoded = encodeCircle(circle({
      gradientEnabled: true,
      gradientStartColor: '#112233',
      gradientEndColor: '#AABBCC',
      gradientDirection: 'bottomToTop',
    }))

    expect(encoded).toMatchObject({
      fill: '#123456',
      gradientEnabled: true,
      gradientStartColor: '#112233',
      gradientEndColor: '#AABBCC',
      gradientDirection: 'bottomToTop',
    })
    expect(decodeCircle(encoded)).toMatchObject({
      fill: '#123456',
      gradientEnabled: true,
      gradientStartColor: '#112233',
      gradientEndColor: '#AABBCC',
      gradientDirection: 'bottomToTop',
    })
  })

  it('defaults legacy circles to a disabled left-to-right gradient using fill', () => {
    expect(decodeCircle(encodeCircle(circle({ solidFill: undefined })))).toMatchObject({
      fill: '#123456',
      gradientEnabled: false,
      gradientStartColor: '#123456',
      gradientEndColor: '#123456',
      gradientDirection: 'leftToRight',
    })
  })

  it('encodes solidFill instead of a Fabric gradient object', () => {
    const encoded = encodeCircle(circle({
      fill: { type: 'linear', colorStops: [] },
      solidFill: '#123456',
      gradientEnabled: true,
      gradientStartColor: '#112233',
      gradientEndColor: '#AABBCC',
    }))

    expect(encoded.fill).toBe('#123456')
  })
})
