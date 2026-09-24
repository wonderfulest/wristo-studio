// @vitest-environment jsdom
import { createPinia, setActivePinia } from 'pinia'
import { useElementDataStore } from '@/stores/elementDataStore'
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

import { createCenterCap, updateCenterCap } from './centerCap.renderer'

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
    setActivePinia(createPinia())
    vi.clearAllMocks()
    canvasObjects = []
  })

  it('registers a created cap so visual themes can discover its base asset and geometry', async () => {
    fromURL.mockResolvedValueOnce(createCap())
    const cap = await createCenterCap({
      id: 'theme-cap', imageUrl: 'base.svg', assetId: 7, left: 0, top: 120, targetSize: 48,
    })

    expect(useElementDataStore().getElementConfig('theme-cap')).toMatchObject({
      id: 'theme-cap', eleType: 'centerCap', imageUrl: 'base.svg', assetId: 7,
      left: 0, top: 120, targetSize: 48,
    })
    expect(cap).toBeDefined()
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

  it('unlocks resizing when a preview update reuses a previously locked center cap', async () => {
    const cap = createCap()
    cap.lockScalingX = true
    cap.lockScalingY = true
    canvasObjects = [cap]

    await updateCenterCap(cap as any, { targetSize: 44 }, { persist: false })

    expect(cap.lockScalingX).toBe(false)
    expect(cap.lockScalingY).toBe(false)
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

  it('creates caps at explicit coordinates including zero and keeps drag positions', async () => {
    setActivePinia(createPinia())
    fromURL.mockResolvedValueOnce(createCap())
    const cap: any = await createCenterCap({ imageUrl: 'base.svg', assetId: 1, left: 0, top: 120 })
    expect(cap).toMatchObject({ left: 0, top: 120, lockMovementX: false, lockMovementY: false })
    cap.set({ left: 80, top: 90 })
    cap.fire('moving')
    cap.fire('modified')
    expect(cap).toMatchObject({ left: 80, top: 90 })
  })

  it('preserves position and asset identity through image replacement and size updates', async () => {
    const cap = createCap()
    cap.set({ left: 10, top: 20, assetId: 7 })
    canvasObjects = [cap]
    fromURL.mockResolvedValueOnce(createCap('next.svg'))
    await updateCenterCap(cap as any, { imageUrl: 'next.svg' })
    const next = canvasObjects[0]
    expect(next).toMatchObject({ left: 10, top: 20, assetId: 7 })
    await updateCenterCap(next, { imageUrl: 'next.svg', targetSize: 60, left: 0 })
    expect(next).toMatchObject({ left: 0, top: 20, scaleX: 3, scaleY: 3 })
    await updateCenterCap(next, { left: undefined, top: undefined })
    expect(next).toMatchObject({ left: 227, top: 227 })
  })
