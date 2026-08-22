// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RotatingHandElementConfig } from '@/types/elements'

const mocks = vi.hoisted(() => {
  const objects: any[] = []
  return {
    objects,
    addLayer: vi.fn(),
    upsertElement: vi.fn(),
    patchElement: vi.fn(),
    canvas: {
      add: vi.fn((object: any) => objects.push(object)),
      remove: vi.fn((object: any) => objects.splice(objects.indexOf(object), 1)),
      getObjects: vi.fn(() => objects),
      requestRenderAll: vi.fn(),
      discardActiveObject: vi.fn(),
      setActiveObject: vi.fn(),
    },
  }
})

function imageObject() {
  return {
    width: 20,
    height: 100,
    set(values: Record<string, unknown>) { Object.assign(this, values) },
    setCoords: vi.fn(),
  }
}

vi.mock('fabric', () => ({
  Image: { fromURL: vi.fn(async () => imageObject()) },
}))
vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => ({ canvas: mocks.canvas }) }))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ addLayer: mocks.addLayer }) }))
vi.mock('@/stores/designStore', () => ({
  useDesignStore: () => ({ watchSize: 454, designSpec: { width: 454, centerX: 227, centerY: 227 } }),
}))
vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({ upsertElement: mocks.upsertElement, patchElement: mocks.patchElement }),
}))
vi.mock('@/stores/analogAssetStore', () => ({ useAnalogAssetStore: () => ({}) }))
vi.mock('@/api/wristo/analogAsset', () => ({ analogAssetApi: {} }))

import { createRotatingHand, updateRotatingHand } from './rotatingHand.renderer'
import { handCalibrationState } from '@/elements/hands/common/handCalibration'
import { Image as MockFabricImage } from 'fabric'

function config(id: string, overrides: Partial<RotatingHandElementConfig> = {}): RotatingHandElementConfig {
  return {
    id,
    eleType: 'rotatingHand',
    left: 110,
    top: 120,
    originX: 'center',
    originY: 'center',
    dialProperty: `dial_range_${id}`,
    progressMode: 'range',
    previewProgress: 50,
    startAngle: 150,
    endAngle: 390,
    counterClockwise: false,
    outOfRangeBehavior: 'clamp',
    assetId: null,
    imageUrl: 'pointer.svg',
    centerX: 110,
    centerY: 120,
    pivotOffsetX: 2,
    pivotOffsetY: 18,
    scalePercent: 50,
    ...overrides,
  }
}

describe('rotating hand renderer', () => {
  afterEach(() => {
    mocks.objects.splice(0)
    vi.clearAllMocks()
    handCalibrationState.active = false
    handCalibrationState.selectedHandId = null
  })

  it('keeps multiple rotating hand instances on the canvas', async () => {
    await createRotatingHand(config('one'))
    await createRotatingHand(config('two', { centerX: 300, centerY: 300 }))

    expect(mocks.objects).toHaveLength(2)
    expect(mocks.canvas.remove).not.toHaveBeenCalled()
    expect(mocks.objects.map(object => object.id)).toEqual(['one', 'two'])
  })

  it('updates preview rotation without changing center or pivot geometry', async () => {
    const hand = await createRotatingHand(config('one')) as any

    await updateRotatingHand(hand, {
      dialProperty: 'dial_range_changed',
      startAngle: 0,
      endAngle: 180,
      previewProgress: 50,
    })

    expect(hand).toMatchObject({
      dialProperty: 'dial_range_changed',
      centerX: 110,
      centerY: 120,
      pivotOffsetX: 2,
      pivotOffsetY: 18,
      angle: 180,
    })
    expect(mocks.patchElement).toHaveBeenCalledWith('one', expect.objectContaining({
      centerX: 110,
      centerY: 120,
      pivotOffsetX: 2,
      pivotOffsetY: 18,
      angle: 180,
    }))
  })

  it('uses 3 o clock as configured zero and 12 o clock as configured 270 degrees', async () => {
    const hand = await createRotatingHand(config('one', {
      startAngle: 0,
      endAngle: 270,
      previewProgress: 0,
    })) as any

    expect(hand.angle).toBe(90)

    await updateRotatingHand(hand, { previewProgress: 100 })

    expect(hand.angle).toBe(0)
  })

  it('keeps the selected rotating hand at 12 o clock during calibration updates', async () => {
    const hand = await createRotatingHand(config('one')) as any
    handCalibrationState.active = true
    handCalibrationState.selectedHandId = 'one'

    await updateRotatingHand(hand, { previewProgress: 80, startAngle: 120 })

    expect(hand.angle).toBe(0)
  })

  it('replaces the bitmap without changing center or pivot geometry', async () => {
    const hand = await createRotatingHand(config('one')) as any

    await updateRotatingHand(hand, { imageUrl: 'replacement.svg', assetId: 9 })

    expect(MockFabricImage.fromURL).toHaveBeenCalledWith('replacement.svg', expect.anything())
    expect(mocks.canvas.remove).toHaveBeenCalledWith(hand)
    expect(mocks.objects).toHaveLength(1)
    expect(mocks.objects[0]).toMatchObject({
      imageUrl: 'replacement.svg',
      assetId: 9,
      centerX: 110,
      centerY: 120,
      pivotOffsetX: 2,
      pivotOffsetY: 18,
      scalePercent: 50,
    })
  })

  it('keeps the existing bitmap when replacement loading fails', async () => {
    const hand = await createRotatingHand(config('one')) as any
    vi.mocked(MockFabricImage.fromURL).mockRejectedValueOnce(new Error('asset unavailable'))

    await expect(updateRotatingHand(hand, { imageUrl: 'broken.svg' })).rejects.toThrow('asset unavailable')

    expect(mocks.canvas.remove).not.toHaveBeenCalled()
    expect(mocks.objects).toEqual([hand])
    expect(hand.imageUrl).toBe('pointer.svg')
  })
})
