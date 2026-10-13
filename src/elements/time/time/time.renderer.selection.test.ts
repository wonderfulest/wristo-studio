// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const runtime = vi.hoisted(() => ({
  patchElement: vi.fn(),
  objects: [] as any[],
  upsertElement: vi.fn(),
  activeObject: null as any,
  setActiveObject: vi.fn((object: any) => { runtime.activeObject = object }),
}))

vi.mock('fabric', () => ({
  FabricText: class {
    type = 'text'
    constructor(public text: string, options: any) { Object.assign(this, options) }
    set(properties: Record<string, unknown>) { Object.assign(this, properties) }
  },
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
  useElementDataStore: () => ({ patchElement: runtime.patchElement, upsertElement: runtime.upsertElement }),
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
  resolveCurrentElementPreviewFont: vi.fn((config: any) => config),
}))

import { createTime, updateTime } from './time.renderer'

describe('bitmap time replacement selection', () => {
  beforeEach(() => {
    runtime.upsertElement.mockClear()
    runtime.patchElement.mockClear()
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

  it('clears the bitmap reference when replacing a bitmap group with TrueType text', async () => {
    await updateTime(runtime.objects[0], { fontRenderType: 'truetype' } as any)
    expect(runtime.objects[0].fontRenderType).toBe('truetype')
    expect(runtime.objects[0].bitmapFontId).toBeNull()
    expect(runtime.patchElement).toHaveBeenCalledWith('time-1', expect.objectContaining({
      fontRenderType: 'truetype', bitmapFontId: null,
    }))
  })

  it('clears a legacy bitmap reference when loading TrueType text', async () => {
    const element = await createTime({ ...runtime.objects[0], fontRenderType: 'truetype' } as any)
    expect(element.bitmapFontId).toBeNull()
    expect(runtime.upsertElement).toHaveBeenCalledWith(expect.objectContaining({ bitmapFontId: null }))
  })

  it('clears a stale reference on an existing TrueType text update', async () => {
    runtime.objects[0].type = 'text'
    runtime.objects[0].fontRenderType = 'truetype'
    await updateTime(runtime.objects[0], { fill: '#123456' } as any)
    expect(runtime.objects[0].bitmapFontId).toBeNull()
  })

})
