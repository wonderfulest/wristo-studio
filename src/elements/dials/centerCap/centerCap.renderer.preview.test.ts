import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromURL, requestRenderAll, remove, add } = vi.hoisted(() => ({
  fromURL: vi.fn(),
  requestRenderAll: vi.fn(),
  remove: vi.fn(),
  add: vi.fn(),
}))

let canvasObjects: any[] = []

vi.mock('fabric', () => ({
  Image: { fromURL },
}))
vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({
    canvas: {
      getObjects: () => canvasObjects,
      getWidth: () => 454,
      getHeight: () => 454,
      remove: (object: any) => {
        remove(object)
        canvasObjects = canvasObjects.filter((candidate) => candidate !== object)
      },
      add: (object: any) => {
        add(object)
        canvasObjects.push(object)
      },
      requestRenderAll,
      discardActiveObject: vi.fn(),
      setActiveObject: vi.fn(),
    },
  }),
}))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ addLayer: vi.fn() }) }))
vi.mock('@/stores/designStore', () => ({
  useDesignStore: () => ({ designSpec: { centerX: 227, centerY: 227 } }),
}))
vi.mock('@/stores/analogAssetStore', () => ({ useAnalogAssetStore: vi.fn() }))
vi.mock('@/api/wristo/analogAsset', () => ({ analogAssetApi: { get: vi.fn() } }))
vi.mock('@/utils/controlManager', () => ({ applyControlsToObject: vi.fn() }))

import { updateCenterCap } from './centerCap.renderer'

function createCap(imageUrl = 'base.svg') {
  const listeners = new Map<string, Array<() => void>>()
  const cap: Record<string, any> = {
    id: 'cap',
    eleType: 'centerCap',
    imageUrl,
    width: 20,
    height: 20,
    scaleX: 2,
    scaleY: 2,
    angle: 0,
    set(key: string | Record<string, unknown>, value?: unknown) {
      if (typeof key === 'string') this[key] = value
      else Object.assign(this, key)
      return this
    },
    setCoords: vi.fn(),
    on(event: string, callback: () => void) {
      listeners.set(event, [...(listeners.get(event) || []), callback])
    },
    fire(event: string) {
      for (const callback of listeners.get(event) || []) callback()
    },
    listenerCount(event: string) {
      return listeners.get(event)?.length ?? 0
    },
  }
  return cap
}

describe('center cap preview updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    canvasObjects = []
  })

  it('binds stable event handlers only once across repeated preview and restore updates', async () => {
    const cap = createCap()
    canvasObjects = [cap]

    await updateCenterCap(cap as any, { targetSize: 44 }, { persist: false })
    await updateCenterCap(cap as any, { targetSize: 40 }, { persist: false })
    await updateCenterCap(cap as any, { targetSize: 44 }, { persist: false })

    for (const event of ['scaling', 'modified', 'moving', 'selected', 'deselected']) {
      expect(cap.listenerCount(event)).toBe(1)
    }
    cap.setCoords.mockClear()
    cap.fire('moving')
    expect(cap.setCoords).toHaveBeenCalledTimes(1)
  })

  it('keeps the old cap on canvas when replacement image loading rejects', async () => {
    const cap = createCap()
    canvasObjects = [cap]
    fromURL.mockRejectedValueOnce(new Error('bad image'))

    await expect(updateCenterCap(
      cap as any,
      { imageUrl: 'bad.svg', assetId: 99 },
      { persist: false },
    )).rejects.toThrow('bad image')

    expect(canvasObjects).toEqual([cap])
    expect(remove).not.toHaveBeenCalled()
    expect(add).not.toHaveBeenCalled()
    expect(cap).toMatchObject({ imageUrl: 'base.svg' })
  })
})
