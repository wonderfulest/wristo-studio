// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWindDirection, updateWindDirection } from './windDirection.renderer'
import { encodeWindDirection, decodeWindDirection } from './windDirection.encoder'
import type { WindDirectionElementConfig } from '@/types/elements/data'

const { objects } = vi.hoisted(() => ({ objects: [] as any[] }))
vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas: {
    add: (object: any) => objects.push(object),
    getObjects: () => objects,
    setActiveObject: vi.fn(),
    renderAll: vi.fn(),
  } }),
}))
vi.mock('@/api/wristo/analogAsset', () => ({ analogAssetApi: { get: vi.fn() } }))

beforeEach(() => {
  objects.length = 0
  vi.stubGlobal('Image', class {
    constructor() {
      const image = document.createElement('img')
      Object.defineProperties(image, {
        naturalWidth: { value: 80 }, naturalHeight: { value: 100 },
        src: { set() { queueMicrotask(() => image.onload?.(new Event('load'))) } },
      })
      return image
    }
  })
})
afterEach(() => { vi.unstubAllGlobals() })

const config = (width: number, height: number): WindDirectionElementConfig => ({
  id: 'wind', eleType: 'windDirection', imageUrl: '/wind.png',
  left: 242, top: 81, originX: 'center', originY: 'center', width, height, windDegree: 35,
})

describe('wind direction saved dimensions', () => {
  it.each([[24, 30], [40, 20], [30, 30]])('preserves %s × %s across repeated reloads', async (width, height) => {
    let saved = config(width, height)
    for (let i = 0; i < 3; i++) {
      const image = await createWindDirection(decodeWindDirection(saved) as WindDirectionElementConfig)
      saved = encodeWindDirection(image)
      expect(saved.width).toBeCloseTo(width)
      expect(saved.height).toBeCloseTo(height)
      expect(saved).toMatchObject({ left: 242, top: 81, windDegree: 35 })
    }
  })

  it('applies actual width and height when updating dimensions', async () => {
    const image = await createWindDirection(config(30, 30))
    await updateWindDirection(image, { width: 24, height: 30 })
    expect(encodeWindDirection(image)).toMatchObject({ width: 24, height: 30 })
  })

  it('applies saved dimensions when replacing the image', async () => {
    const image = await createWindDirection(config(30, 30))
    await updateWindDirection(image, { imageUrl: '/replacement.png', width: 24, height: 30 })
    expect(encodeWindDirection(image)).toMatchObject({ width: 24, height: 30 })
  })
})
