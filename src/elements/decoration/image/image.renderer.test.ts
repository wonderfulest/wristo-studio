// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const runtime = vi.hoisted(() => ({
  canvas: null as any,
  elementDataStore: null as any,
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas: runtime.canvas }),
}))

vi.mock('@/stores/layerStore', () => ({
  useLayerStore: () => ({ addLayer: vi.fn() }),
}))

vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => runtime.elementDataStore,
}))

vi.mock('@/api/wristo/analogAsset', () => ({
  analogAssetApi: { get: vi.fn() },
}))

vi.mock('@/utils/controlManager', () => ({
  applyControlsToObject: vi.fn(),
}))

vi.mock('fabric', () => ({
  Image: class FakeFabricImage {
    width = 1
    height = 1
    scaleX = 1
    scaleY = 1

    constructor(_element: unknown, options: Record<string, unknown>) {
      Object.assign(this, options)
    }

    on() { return this }
    set(values: Record<string, unknown>) { Object.assign(this, values); return this }
    getScaledWidth() { return this.width * this.scaleX }
    getScaledHeight() { return this.height * this.scaleY }
  },
}))

import { createImage, updateImage } from './image.renderer'

class FakeHtmlImage {
  naturalWidth = 200
  naturalHeight = 200
  width = 200
  height = 200
  crossOrigin = ''
  onload: null | (() => void) = null
  onerror: null | ((error: unknown) => void) = null

  set src(_value: string) {
    queueMicrotask(() => this.onload?.())
  }
}

describe('updateImage', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', FakeHtmlImage)
    runtime.elementDataStore = { patchElement: vi.fn() }
  })

  it('keeps both displayed dimensions when replacing a non-empty image', async () => {
    const image = {
      id: 'image-1',
      imageUrl: 'https://assets.example/old.png',
      assetId: 1,
      width: 300,
      height: 150,
      scaleX: 0.4,
      scaleY: 80 / 150,
      getScaledWidth() {
        return this.width * this.scaleX
      },
      getScaledHeight() {
        return this.height * this.scaleY
      },
      setElement: vi.fn(),
      set(values: Record<string, unknown>) {
        Object.assign(this, values)
      },
      setCoords: vi.fn(),
    }
    runtime.canvas = {
      getObjects: () => [image],
      requestRenderAll: vi.fn(),
    }

    await updateImage(image as any, {
      imageUrl: 'https://assets.example/new-square.png',
      assetId: 2,
    })

    expect(image.getScaledWidth()).toBeCloseTo(120)
    expect(image.getScaledHeight()).toBeCloseTo(80)
  })
})

describe('createImage', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', FakeHtmlImage)
    runtime.elementDataStore = { upsertElement: vi.fn() }
  })

  it('exposes the requested runtime element type when the canvas first selects it', async () => {
    const selectedTypes: string[] = []
    runtime.canvas = {
      add: vi.fn(),
      setActiveObject: (element: { eleType: string }) => selectedTypes.push(element.eleType),
      requestRenderAll: vi.fn(),
    }

    await (createImage as any)({
      id: 'dynamic-image-1',
      eleType: 'dynamicImage',
      width: 100,
      height: 100,
    })

    expect(selectedTypes).toEqual(['dynamicImage'])
  })
})
