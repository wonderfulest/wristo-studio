// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const runtime = vi.hoisted(() => ({
  objects: [] as any[],
  activeObject: null as any,
  setActiveObject: vi.fn((object: any) => { runtime.activeObject = object }),
}))

vi.mock('fabric', () => ({
  FabricText: class {},
  FabricImage: {
    fromURL: vi.fn().mockResolvedValue({
      width: 10,
      height: 20,
      set(properties: Record<string, unknown>) { Object.assign(this, properties) },
    }),
  },
  Group: class {
    type = 'group'
    scaleX = 1
    scaleY = 1
    constructor(public objects: any[]) {}
    set(properties: Record<string, unknown>) { Object.assign(this, properties) }
  },
}))

const canvas = {
  getObjects: () => runtime.objects,
  getActiveObject: () => runtime.activeObject,
  remove: (object: any) => {
    runtime.objects = runtime.objects.filter((candidate) => candidate !== object)
  },
  add: (object: any) => { runtime.objects.push(object) },
  moveObjectTo: vi.fn(),
  setActiveObject: runtime.setActiveObject,
  renderAll: vi.fn(),
}

vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => ({ canvas }) }))
vi.mock('@/stores/layerStore', () => ({
  useLayerStore: () => ({ layers: [{ id: 'time-1', element: null }], addLayer: vi.fn() }),
}))
vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({ patchElement: vi.fn(), upsertElement: vi.fn() }),
}))
vi.mock('@/api/wristo/bitmapFont', () => ({
  listBitmapFontChars: vi.fn().mockResolvedValue({
    data: ['1', '2', ':', '3', '4'].map((charValue) => ({
      charValue,
      image: { url: `https://example.com/${charValue}.png` },
    })),
  }),
}))
vi.mock('@/engine/simulator/simulatedClock', () => ({
  getSimulatedNow: () => new Date('2026-09-01T12:34:00Z'),
}))
vi.mock('@/composables/useGarminSystemFont', () => ({
  applyCurrentElementPreviewFont: vi.fn(),
  resolveCurrentElementPreviewFont: vi.fn(),
}))

import { updateTime } from './time.renderer'

describe('bitmap time replacement selection', () => {
  beforeEach(() => {
    runtime.setActiveObject.mockClear()
    runtime.activeObject = { id: 'other-element' }
    runtime.objects = [{
      id: 'time-1',
      eleType: 'time',
      type: 'group',
      text: '12:33',
      bitmapFontId: 7,
      formatter: 0,
      left: 10,
      top: 20,
      originX: 'center',
      originY: 'center',
      fontSize: 20,
      fontGap: 1,
      scaleX: 1,
      scaleY: 1,
    }]
  })

  it('does not select an unselected bitmap time group when the minute changes', async () => {
    await updateTime(runtime.objects[0], {
      simulatedTime: new Date('2026-09-01T12:34:00Z'),
    } as any, { persist: false })

    expect(runtime.setActiveObject).not.toHaveBeenCalled()
    expect(runtime.activeObject).toEqual({ id: 'other-element' })
  })

  it('keeps selection on a bitmap time group when the selected group is replaced', async () => {
    runtime.activeObject = runtime.objects[0]

    await updateTime(runtime.objects[0], {
      simulatedTime: new Date('2026-09-01T12:34:00Z'),
    } as any, { persist: false })

    expect(runtime.setActiveObject).toHaveBeenCalledTimes(1)
    expect(runtime.activeObject).toMatchObject({ id: 'time-1', type: 'group', text: '20:34' })
  })
})
