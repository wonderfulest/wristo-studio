import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  canvas: null as any,
  objectsById: new Map<string, any>(),
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas: state.canvas }),
}))

vi.mock('@/stores/layerStore', () => ({
  useLayerStore: () => ({
    previewMode: 'active',
    setLayers: vi.fn(),
  }),
}))

vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({ getElementConfig: vi.fn() }),
}))

vi.mock('@/engine/managers/elementManager', () => ({
  getElementById: (id: string) => state.objectsById.get(String(id)) ?? null,
}))

import { bringForward, bringToFront, sendBackward, sendToBack } from './layerManager'

type TestObject = { id: string; eleType: string }

function createFixture() {
  const objects: TestObject[] = [
    { id: 'global', eleType: 'global' },
    { id: 'background', eleType: 'background' },
    { id: 'bottom', eleType: 'time' },
    { id: 'middle', eleType: 'date' },
    { id: 'top', eleType: 'weather' },
  ]

  const moveObjectTo = vi.fn((target: TestObject, index: number) => {
    const currentIndex = objects.indexOf(target)
    if (currentIndex < 0) return
    objects.splice(currentIndex, 1)
    objects.splice(index, 0, target)
  })

  state.objectsById = new Map(objects.map((object) => [object.id, object]))
  state.canvas = {
    getObjects: () => objects,
    moveObjectTo,
    bringObjectToFront: vi.fn((target: TestObject) => moveObjectTo(target, objects.length - 1)),
    requestRenderAll: vi.fn(),
  }

  return { objects }
}

describe('layerManager reorder results', () => {
  beforeEach(() => {
    state.canvas = null
    state.objectsById = new Map()
  })

  it('moves an object to front and reports a repeated move as unchanged', () => {
    const { objects } = createFixture()

    expect(bringToFront('middle')).toBe(true)
    expect(objects.map((item) => item.id)).toEqual(['global', 'background', 'bottom', 'top', 'middle'])
    expect(bringToFront('middle')).toBe(false)
  })

  it('reports adjacent boundary moves as unchanged', () => {
    createFixture()

    expect(sendBackward('bottom')).toBe(false)
    expect(bringForward('top')).toBe(false)
  })

  it('keeps fixed layers below an object sent to back', () => {
    const { objects } = createFixture()

    expect(sendToBack('bottom')).toBe(false)
    expect(sendToBack('top')).toBe(true)
    expect(objects.map((item) => item.id)).toEqual(['global', 'background', 'top', 'bottom', 'middle'])
  })
})
