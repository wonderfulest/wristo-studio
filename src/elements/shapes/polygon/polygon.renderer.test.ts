import { beforeEach, describe, expect, it, vi } from 'vitest'

const { patchElement, requestRenderAll } = vi.hoisted(() => ({
  patchElement: vi.fn(),
  requestRenderAll: vi.fn(),
}))
vi.mock('fabric', () => ({ Polygon: class {} }))
vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: vi.fn() }))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ previewMode: 'normal' }) }))
vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({ patchElement }),
}))
vi.mock('@/utils/controlManager', () => ({ applyControlsToObject: vi.fn() }))
vi.mock('../rectangle/rectangle.gradient', () => ({
  createRectangleGradientFill: () => null,
  normalizeRectangleGradientDirection: (value: unknown) => value ?? 'horizontal',
}))
import { buildPolygonCanvasGeometry, updatePolygon } from './polygon.renderer'

const triangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }]

describe('polygon renderer geometry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('denormalizes points into a centered Fabric bounding box', () => {
    expect(buildPolygonCanvasGeometry(triangle, 100, 80)).toEqual({
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 80 }],
      width: 100,
      height: 80,
      pathOffset: { x: 50, y: 40 },
    })
  })

  it('absorbs scale into positive logical dimensions', () => {
    expect(buildPolygonCanvasGeometry(triangle, 100 * 1.5, 80 * 0.5)).toMatchObject({ width: 150, height: 40 })
  })

  it('previews and restores actual fill and stroke without persisting', () => {
    const polygon: Record<string, any> = {
      id: 'polygon',
      left: 10,
      top: 20,
      width: 100,
      height: 80,
      logicalWidth: 100,
      logicalHeight: 80,
      polygonPoints: triangle,
      solidFill: '#101010',
      fill: '#101010',
      stroke: '#202020',
      strokeWidth: 2,
      opacity: 1,
      displayStates: [],
      set(key: string | Record<string, unknown>, value?: unknown) {
        if (typeof key === 'string') this[key] = value
        else Object.assign(this, key)
        return this
      },
      setCoords: vi.fn(),
      canvas: { requestRenderAll },
    }

    updatePolygon(polygon as any, { fill: '#abcdef', stroke: '#123456' }, { persist: false })
    expect(polygon).toMatchObject({ fill: '#abcdef', solidFill: '#abcdef', stroke: '#123456' })
    expect(patchElement).not.toHaveBeenCalled()

    updatePolygon(polygon as any, { fill: '#101010', stroke: '#202020' }, { persist: false })
    expect(polygon).toMatchObject({ fill: '#101010', solidFill: '#101010', stroke: '#202020' })
    expect(patchElement).not.toHaveBeenCalled()
  })
})
