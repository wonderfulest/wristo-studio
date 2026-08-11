// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  patchElement: vi.fn(),
  upsertElement: vi.fn(),
  addLayer: vi.fn(),
  releaseImage: null as null | (() => void),
  canvas: {
    remove: vi.fn(),
    add: vi.fn(),
    requestRenderAll: vi.fn(),
    discardActiveObject: vi.fn(),
    setActiveObject: vi.fn(),
  },
}))

vi.mock('fabric', () => ({
  Image: {
    fromURL: vi.fn(() => new Promise((resolve) => {
      mocks.releaseImage = () => resolve({
        width: 10,
        height: 100,
        scaleX: 1,
        scaleY: 1,
        set(values: Record<string, unknown>) { Object.assign(this, values) },
        setCoords: vi.fn(),
        rotate: vi.fn(),
      })
    })),
  },
}))
vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => ({ canvas: mocks.canvas }) }))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ addLayer: mocks.addLayer }) }))
vi.mock('@/stores/designStore', () => ({
  useDesignStore: () => ({ watchSize: 454, designSpec: { centerX: 227, centerY: 227 } }),
}))
vi.mock('@/stores/analogAssetStore', () => ({ useAnalogAssetStore: () => ({}) }))
vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({
    patchElement: mocks.patchElement,
    upsertElement: mocks.upsertElement,
  }),
}))
vi.mock('@/api/wristo/analogAsset', () => ({ analogAssetApi: {} }))
vi.mock('@/engine/simulator/simulatedClock', () => ({ getSimulatedNow: () => new Date(0) }))

import { updateHand } from './hand.renderer'

describe('hand renderer preview persistence', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('never writes elementDataStore while a deferred preview image resolves or restores', async () => {
    vi.useFakeTimers()
    const hand = {
      id: 'hour',
      eleType: 'hourHand',
      imageUrl: 'base.svg',
      assetId: 1,
      left: 227,
      top: 227,
      angle: 0,
      set(values: Record<string, unknown>) { Object.assign(this, values) },
      setCoords: vi.fn(),
      rotate: vi.fn(),
    } as any

    const pending = updateHand(
      hand,
      { imageUrl: 'theme.svg', assetId: 2 },
      { persist: false },
    )
    expect(mocks.patchElement).not.toHaveBeenCalled()
    expect(mocks.upsertElement).not.toHaveBeenCalled()

    mocks.releaseImage?.()
    await pending
    expect(mocks.patchElement).not.toHaveBeenCalled()
    expect(mocks.upsertElement).not.toHaveBeenCalled()

    await updateHand(hand, { imageUrl: null, assetId: null }, { persist: false })
    expect(mocks.patchElement).not.toHaveBeenCalled()
    expect(mocks.upsertElement).not.toHaveBeenCalled()
  })

  it('applies geometry center, pivot offset, and scale updates to the rendered hand', async () => {
    vi.useFakeTimers()
    const hand = {
      id: 'minute',
      eleType: 'minuteHand',
      imageUrl: 'base.svg',
      assetId: 1,
      width: 20,
      height: 100,
      left: 227,
      top: 227,
      angle: 0,
      set(values: Record<string, unknown>) { Object.assign(this, values) },
      setCoords: vi.fn(),
    } as any

    await updateHand(hand, {
      centerX: 210,
      centerY: 220,
      pivotOffsetX: 10,
      pivotOffsetY: -20,
      scalePercent: 50,
    })

    expect(hand).toMatchObject({
      centerX: 210,
      centerY: 220,
      pivotOffsetX: 10,
      pivotOffsetY: -20,
      scalePercent: 50,
      scaleX: 2.27,
      scaleY: 2.27,
    })
    expect(mocks.patchElement).toHaveBeenCalledWith('minute', expect.objectContaining({
      centerX: 210,
      centerY: 220,
      pivotOffsetX: 10,
      pivotOffsetY: -20,
      scalePercent: 50,
    }))
  })
})
