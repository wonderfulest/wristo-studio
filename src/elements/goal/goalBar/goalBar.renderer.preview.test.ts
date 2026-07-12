import { beforeEach, describe, expect, it, vi } from 'vitest'

const { patchElement, upsertElement, requestRenderAll } = vi.hoisted(() => ({
  patchElement: vi.fn(),
  upsertElement: vi.fn(),
  requestRenderAll: vi.fn(),
}))

vi.mock('fabric', () => {
  class FabricObject {
    [key: string]: any
    constructor(options: Record<string, any> = {}) { Object.assign(this, options) }
    set(values: Record<string, any>) { Object.assign(this, values); return this }
    setCoords() {}
  }
  class Rect extends FabricObject {}
  class Polygon extends FabricObject {
    points: Array<{ x: number; y: number }>
    constructor(points: Array<{ x: number; y: number }>, options = {}) {
      super(options)
      this.points = points.map((point) => ({ ...point }))
    }
  }
  class Group extends FabricObject {
    objects: any[]
    failAfterObjectsChangeOnce = false
    constructor(objects: any[] = [], options = {}) { super(options); this.objects = [...objects] }
    getObjects() { return this.objects }
    add(child: any) { this.objects.push(child) }
    remove(child: any) { this.objects = this.objects.filter((item) => item !== child) }
    _onAfterObjectsChange() {
      if (this.failAfterObjectsChangeOnce) {
        this.failAfterObjectsChangeOnce = false
        throw new Error('layout failed')
      }
    }
  }
  return { Rect, Polygon, Group }
})

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas: { requestRenderAll } }),
}))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ addLayer: vi.fn() }) }))
vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({ patchElement, upsertElement }),
}))
vi.mock('@/utils/controlManager', () => ({ applyControlsToObject: vi.fn() }))

import { Group, Rect, Polygon } from 'fabric'
import {
  previewGoalBarPolygon,
  restoreGoalBarPreview,
} from './goalBar.renderer'

const polygonPoints = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0.8, y: 1 },
  { x: 0.2, y: 1 },
]

function createRectangleGoalBar() {
  const background = new Rect({ id: 'goal_background', width: 200, height: 20 })
  const progress = new Rect({ id: 'goal_progress' })
  const config = {
    id: 'goal', eleType: 'goalBar', left: 10, top: 20, width: 200, height: 20,
    padding: 0, progress: 0.5, progressAlign: 'left', variant: 'continuous',
    segments: 10, gap: 2, shape: 'rectangle', polygonPoints: [], borderRadius: 5,
    color: '#0f0', bgColor: '#333', borderWidth: 0, borderColor: '#fff',
    goalProperty: '', gradientEnabled: false, gradientStartColor: '#0f0',
    gradientEndColor: '#0f0', originX: 'center', originY: 'center',
  }
  const group = new Group([background, progress], {
    id: 'goal', eleType: 'goalBar', left: 17, top: 29, shape: 'rectangle',
    polygonPoints: [], progress: 0.5,
  } as any) as any
  group.__element = { kind: 'widget', type: 'goalBar', config, children: { background, progress } }
  return { group, config }
}

describe('goal bar polygon preview', () => {
  beforeEach(() => {
    patchElement.mockClear()
    upsertElement.mockClear()
    requestRenderAll.mockClear()
  })

  it('rebuilds polygon visuals without mutating persistent or encoder-visible metadata', () => {
    const { group, config } = createRectangleGoalBar()
    const snapshot = structuredClone(config)
    const liveSnapshot = {
      left: group.left,
      top: group.top,
      shape: group.shape,
      polygonPoints: structuredClone(group.polygonPoints),
      progress: group.progress,
    }

    expect(previewGoalBarPolygon(group, polygonPoints)).toBe(true)

    expect(group.__element.config).toEqual(snapshot)
    expect({
      left: group.left,
      top: group.top,
      shape: group.shape,
      polygonPoints: group.polygonPoints,
      progress: group.progress,
    }).toEqual(liveSnapshot)
    expect(group.__element.children.background).toBeInstanceOf(Polygon)
    expect(group.getObjects().some((child: any) => child instanceof Polygon)).toBe(true)
    expect(patchElement).not.toHaveBeenCalled()
    expect(upsertElement).not.toHaveBeenCalled()
    expect(requestRenderAll).toHaveBeenCalledTimes(1)
  })

  it('restores visuals from persistent config without changing it', () => {
    const { group, config } = createRectangleGoalBar()
    const snapshot = structuredClone(config)
    previewGoalBarPolygon(group, polygonPoints)
    requestRenderAll.mockClear()

    restoreGoalBarPreview(group)

    expect(group.__element.config).toEqual(snapshot)
    expect(group.__element.children.background).toBeInstanceOf(Rect)
    expect(group.__element.children.background).not.toBeInstanceOf(Polygon)
    expect(group.shape).toBe('rectangle')
    expect(group.polygonPoints).toEqual([])
    expect(patchElement).not.toHaveBeenCalled()
    expect(upsertElement).not.toHaveBeenCalled()
    expect(requestRenderAll).toHaveBeenCalledTimes(1)
  })

  it.each([
    [[{ x: 0, y: 0 }, { x: 1, y: 0 }]],
    [[{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }]],
  ])('rejects invalid points without changing visuals', (points) => {
    const { group } = createRectangleGoalBar()
    const originalChildren = group.getObjects().slice()
    expect(previewGoalBarPolygon(group, points as any)).toBe(false)
    expect(group.getObjects()).toEqual(originalChildren)
    expect(requestRenderAll).not.toHaveBeenCalled()
  })

  it('rejects non-goal-bar elements without changing visuals', () => {
    const group = new Group([], { id: 'other', eleType: 'text' } as any) as any
    group.__element = { config: { eleType: 'text' }, children: {} }
    expect(previewGoalBarPolygon(group, polygonPoints)).toBe(false)
    expect(group.getObjects()).toEqual([])
  })

  it('rolls back objects, children metadata, and live fields when preview layout throws', () => {
    const { group, config } = createRectangleGoalBar()
    const originalObjects = group.getObjects().slice()
    const originalChildren = group.__element.children
    const originalChildrenEntries = { ...originalChildren }
    const liveSnapshot = {
      left: group.left,
      top: group.top,
      shape: group.shape,
      polygonPoints: structuredClone(group.polygonPoints),
      progress: group.progress,
    }
    group.failAfterObjectsChangeOnce = true

    expect(previewGoalBarPolygon(group, polygonPoints)).toBe(false)

    expect(group.getObjects()).toEqual(originalObjects)
    expect(group.__element.children).toBe(originalChildren)
    expect(group.__element.children).toEqual(originalChildrenEntries)
    expect(group.__element.config).toBe(config)
    expect({
      left: group.left,
      top: group.top,
      shape: group.shape,
      polygonPoints: group.polygonPoints,
      progress: group.progress,
    }).toEqual(liveSnapshot)
    expect(requestRenderAll).not.toHaveBeenCalled()
    expect(patchElement).not.toHaveBeenCalled()
    expect(upsertElement).not.toHaveBeenCalled()
  })

  it('rejects goal-bar-shaped plain objects in both preview entry points', () => {
    const plainObject = {
      id: 'fake',
      eleType: 'goalBar',
      __element: { config: { eleType: 'goalBar' }, children: {} },
      getObjects: () => [],
      set: vi.fn(),
      setCoords: vi.fn(),
    } as any

    expect(previewGoalBarPolygon(plainObject, polygonPoints)).toBe(false)
    expect(() => restoreGoalBarPreview(plainObject)).not.toThrow()
    expect(plainObject.set).not.toHaveBeenCalled()
    expect(requestRenderAll).not.toHaveBeenCalled()
  })
})
