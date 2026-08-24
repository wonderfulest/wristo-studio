import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromURL, addLayer } = vi.hoisted(() => ({
  fromURL: vi.fn(),
  addLayer: vi.fn(),
}))

vi.mock('fabric', () => ({ Image: { fromURL } }))
vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({
    canvas: {
      getWidth: () => 454,
      getHeight: () => 454,
      add: vi.fn(),
      requestRenderAll: vi.fn(),
      discardActiveObject: vi.fn(),
      setActiveObject: vi.fn(),
    },
  }),
}))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ addLayer }) }))
vi.mock('@/stores/designStore', () => ({
  useDesignStore: () => ({ watchSize: 454, designSpec: { width: 454, centerX: 227, centerY: 227 } }),
}))
vi.mock('@/stores/analogAssetStore', () => ({ useAnalogAssetStore: vi.fn() }))
vi.mock('@/api/wristo/analogAsset', () => ({ analogAssetApi: { get: vi.fn() } }))
vi.mock('@/utils/controlManager', () => ({ applyControlsToObject: vi.fn() }))

import { createDial } from './dial.renderer'

function createImage() {
  return {
    width: 454,
    height: 454,
    scaleX: 1,
    scaleY: 1,
    set(values: Record<string, unknown>) {
      Object.assign(this, values)
      return this
    },
    setCoords: vi.fn(),
    scaleToWidth: vi.fn(),
    on: vi.fn(),
  }
}

describe('dial position persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromURL.mockResolvedValue(createImage())
  })

  it('restores a saved tick60 position instead of resetting it to the dial center', async () => {
    const element = await createDial(
      {
        id: 'tick-60',
        eleType: 'tick60',
        imageUrl: '/tick60.svg',
        assetId: 60,
        left: 210,
        top: 236,
        scaleFactor: 1,
      },
      'tick60',
    )

    expect(element).toMatchObject({ left: 210, top: 236 })
  })
})
