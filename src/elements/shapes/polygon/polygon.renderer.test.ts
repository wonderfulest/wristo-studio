import { describe, expect, it, vi } from 'vitest'

vi.mock('fabric', () => ({ Polygon: class {} }))
vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: vi.fn() }))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: vi.fn() }))
vi.mock('@/stores/elementDataStore', () => ({ useElementDataStore: vi.fn() }))
vi.mock('@/utils/controlManager', () => ({ applyControlsToObject: vi.fn() }))
import { buildPolygonCanvasGeometry } from './polygon.renderer'

const triangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }]

describe('polygon renderer geometry', () => {
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
})
