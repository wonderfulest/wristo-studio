// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => {
  const objects: any[] = []
  const layers: any[] = []
  const stored = new Map<string, any>()
  const canvas = {
    add: (object: any) => objects.push(object),
    setActiveObject: vi.fn(),
    requestRenderAll: vi.fn(),
  }
  return { objects, layers, stored, canvas }
})

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas: state.canvas }),
}))
vi.mock('@/stores/layerStore', () => ({
  useLayerStore: () => ({
    previewMode: 'active',
    addLayer: (object: any) => state.layers.push(object),
  }),
}))
vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({
    upsertElement: (config: any) => state.stored.set(String(config.id), config),
    patchElement: (id: string, patch: any) => state.stored.set(id, {
      ...(state.stored.get(id) ?? {}),
      ...patch,
    }),
  }),
}))
vi.mock('@/utils/controlManager', () => ({ applyControlsToObject: vi.fn() }))

import * as renderer from './gridLines.renderer'

describe('createGridLines', () => {
  beforeEach(() => {
    state.objects.length = 0
    state.layers.length = 0
    state.stored.clear()
    state.canvas.setActiveObject.mockClear()
    state.canvas.requestRenderAll.mockClear()
  })

  it('adds the Grid Lines group to the canvas, layer list, and element store', async () => {
    const createGridLines = (renderer as any).createGridLines

    expect(createGridLines).toBeTypeOf('function')
    const result = await createGridLines({
      id: 'grid-create',
      eleType: 'gridLines',
      left: 227,
      top: 227,
      width: 200,
      height: 80,
      spacing: 20,
      lineWidth: 1,
      color: '#FFFFFF',
      colorProperty: null,
      rotation: 0,
      originX: 'center',
      originY: 'center',
    })

    expect(state.objects).toEqual([result])
    expect(state.layers).toEqual([result])
    expect(state.stored.get('grid-create')).toMatchObject({
      eleType: 'gridLines',
      width: 200,
      height: 80,
      spacing: 20,
    })
    expect(state.canvas.setActiveObject).toHaveBeenCalledWith(result)
  })
})
