// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runtime = vi.hoisted(() => ({
  canvasStore: null as any,
  layerStore: null as any,
  elementDataStore: null as any,
  designStore: {
    watchSize: 454,
    designSpec: { width: 454, height: 454, centerX: 227, centerY: 227 },
  },
  analogAssetStore: {
    loadAssets: vi.fn(),
    assetsByType: {},
  },
  fabricImageResolvers: [] as Array<(image: any) => void>,
  pendingHtmlImages: [] as any[],
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => runtime.canvasStore,
}))

vi.mock('@/stores/layerStore', () => ({
  useLayerStore: () => runtime.layerStore,
}))

vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => runtime.elementDataStore,
}))

vi.mock('@/stores/designStore', () => ({
  useDesignStore: () => runtime.designStore,
}))

vi.mock('@/stores/analogAssetStore', () => ({
  useAnalogAssetStore: () => runtime.analogAssetStore,
}))

vi.mock('@/api/wristo/analogAsset', () => ({
  analogAssetApi: {
    get: vi.fn(),
  },
}))

vi.mock('@/utils/controlManager', () => ({
  applyControlsToObject: vi.fn(),
}))

vi.mock('fabric', () => {
  class FakeFabricImage {
    static fromURL(): Promise<FakeFabricImage> {
      return new Promise((resolve) => runtime.fabricImageResolvers.push(resolve))
    }

    width = 20
    height = 100
    scaleX = 1
    scaleY = 1
    left = 0
    top = 0
    originX = 'center'
    originY = 'center'
    id?: string
    eleType?: string
    imageUrl?: string
    assetId?: number

    constructor(_element?: unknown, options: Record<string, unknown> = {}) {
      Object.assign(this, options)
    }

    set(keyOrValues: string | Record<string, unknown>, value?: unknown) {
      if (typeof keyOrValues === 'string') {
        ;(this as any)[keyOrValues] = value
      } else {
        Object.assign(this, keyOrValues)
      }
      return this
    }

    on() {
      return this
    }

    setCoords() {}

    getScaledWidth() {
      return this.width * this.scaleX
    }

    getScaledHeight() {
      return this.height * this.scaleY
    }
  }

  return {
    Image: FakeFabricImage,
  }
})

import { Image as FabricImage } from 'fabric'
import { createHand } from '@/elements/hands/common/hand.renderer'
import { createImage } from '@/elements/decoration/image/image.renderer'

type FakeElement = {
  id: string
  eleType: string
}

const createCanvas = (initial: FakeElement[] = []) => {
  let objects: any[] = [...initial]
  let activeObject: any = null
  return {
    replaceObjects(next: FakeElement[]) {
      objects = [...next]
    },
    getObjects: () => objects,
    add: (element: any) => {
      objects.push(element)
    },
    remove: (element: any) => {
      objects = objects.filter((candidate) => candidate !== element)
    },
    requestRenderAll: vi.fn(),
    renderAll: vi.fn(),
    discardActiveObject: () => {
      activeObject = null
    },
    setActiveObject: (element: any) => {
      activeObject = element
    },
    getActiveObject: () => activeObject,
  }
}

const createLayerStore = () => ({
  layers: [] as any[],
  previewMode: 'active',
  addLayer(element: any) {
    this.layers.push({ id: String(element.id), eleType: element.eleType, element })
  },
  removeLayer(id: string) {
    this.layers = this.layers.filter((layer) => layer.id !== String(id))
  },
})

const createElementDataStore = () => ({
  elementMap: {} as Record<string, any>,
  upsertElement(config: any) {
    this.elementMap[String(config.id)] = {
      id: String(config.id),
      eleType: config.eleType,
      config: { ...config },
    }
  },
  removeElement(id: string) {
    delete this.elementMap[String(id)]
  },
})

const switchToDocumentB = (canvas: ReturnType<typeof createCanvas>, element: FakeElement) => {
  canvas.replaceObjects([element])
  runtime.layerStore.layers = [{ id: element.id, eleType: element.eleType, element }]
  runtime.elementDataStore.elementMap = {
    [element.id]: {
      id: element.id,
      eleType: element.eleType,
      config: { id: element.id, eleType: element.eleType, document: 'B' },
    },
  }
}

const expectDocumentBUnchanged = (
  canvas: ReturnType<typeof createCanvas>,
  element: FakeElement,
) => {
  expect(canvas.getObjects()).toEqual([element])
  expect(runtime.layerStore.layers).toEqual([
    { id: element.id, eleType: element.eleType, element },
  ])
  expect(runtime.elementDataStore.elementMap).toEqual({
    [element.id]: {
      id: element.id,
      eleType: element.eleType,
      config: { id: element.id, eleType: element.eleType, document: 'B' },
    },
  })
}

describe('shortcut renderer cancellation', () => {
  let generation = 1

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    generation = 1
    runtime.fabricImageResolvers.length = 0
    runtime.pendingHtmlImages.length = 0
    runtime.layerStore = createLayerStore()
    runtime.elementDataStore = createElementDataStore()
    runtime.analogAssetStore.loadAssets.mockReset()
    vi.spyOn(window, 'setInterval').mockReturnValue(1 as any)

    class DeferredHtmlImage {
      onload: (() => void) | null = null
      onerror: ((error: unknown) => void) | null = null
      naturalWidth = 120
      naturalHeight = 80
      width = 120
      height = 80
      crossOrigin = ''
      private value = ''

      set src(next: string) {
        this.value = next
        runtime.pendingHtmlImages.push(this)
      }

      get src() {
        return this.value
      }
    }

    vi.stubGlobal('Image', DeferredHtmlImage)
  })

  it('does not let a stale hand renderer replace document B hand state', async () => {
    const canvas = createCanvas()
    runtime.canvasStore = {
      canvas,
      activeIds: [] as string[],
      setActiveIds(ids: string[]) {
        this.activeIds = ids
      },
    }
    const expectedGeneration = generation
    const renderContext = {
      assertDocumentCurrent: () => {
        if (generation !== expectedGeneration) throw new Error('stale hand renderer')
      },
    }

    const pending = (createHand as any)(
      {
        id: 'old-hour-hand',
        eleType: 'hourHand',
        imageUrl: 'https://example.com/old-hand.png',
      },
      renderContext,
    )
    await Promise.resolve()

    const documentBHand = { id: 'document-b-hour-hand', eleType: 'hourHand' }
    generation = 2
    switchToDocumentB(canvas, documentBHand)

    const oldHand = new (FabricImage as any)(null, { width: 20, height: 100 })
    runtime.fabricImageResolvers.shift()?.(oldHand)

    await expect(pending).rejects.toThrow('stale hand renderer')
    expectDocumentBUnchanged(canvas, documentBHand)
    expect(canvas.getObjects()).not.toContain(oldHand)
  })

  it('does not let a stale image renderer append state to document B', async () => {
    const canvas = createCanvas()
    runtime.canvasStore = { canvas, activeIds: [] }
    const expectedGeneration = generation
    const renderContext = {
      assertDocumentCurrent: () => {
        if (generation !== expectedGeneration) throw new Error('stale image renderer')
      },
    }

    const pending = (createImage as any)(
      {
        id: 'old-image',
        eleType: 'image',
        imageUrl: 'https://example.com/old-image.png',
        left: 100,
        top: 100,
        width: 60,
        height: 40,
      },
      renderContext,
    )
    await Promise.resolve()
    await Promise.resolve()

    const documentBImage = { id: 'document-b-image', eleType: 'image' }
    generation = 2
    switchToDocumentB(canvas, documentBImage)

    const pendingImage = runtime.pendingHtmlImages.shift()
    expect(pendingImage).toBeTruthy()
    pendingImage.onload?.()

    await expect(pending).rejects.toThrow('stale image renderer')
    expectDocumentBUnchanged(canvas, documentBImage)
    expect(canvas.getObjects().some((element: any) => element.id === 'old-image')).toBe(false)
  })
})
