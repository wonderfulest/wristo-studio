import { beforeEach, describe, expect, it, vi } from 'vitest'

const runtime = vi.hoisted(() => ({
  canvas: null as any,
  storedConfig: null as any,
  upsertElement: vi.fn(),
  patchElement: vi.fn()
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas: runtime.canvas })
}))

vi.mock('@/stores/layerStore', () => ({
  useLayerStore: () => ({
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    previewMode: 'normal'
  })
}))

vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({
    getElementConfig: () => runtime.storedConfig,
    upsertElement: runtime.upsertElement,
    patchElement: runtime.patchElement,
    removeElement: vi.fn()
  })
}))

vi.mock('@/stores/historyStore', () => ({
  useHistoryStore: () => ({ saveState: vi.fn() })
}))

import { registerElement } from '@/engine/registry/elementRegistry'
import { updateElement } from './elementManager'

type FakeElement = {
  id: string
  eleType: string
  left: number
  top: number
  angle?: number
  type?: string
  __element?: { config: Record<string, any> }
  set: ReturnType<typeof vi.fn>
  setCoords: ReturnType<typeof vi.fn>
}

function makeElement(options: Partial<FakeElement> = {}): FakeElement {
  const element = {
    id: 'stable-element',
    eleType: 'position-stability-single',
    left: 137,
    top: 219,
    angle: 23,
    __element: { config: { id: 'stable-element', eleType: 'position-stability-single', left: 320, top: 180 } },
    set: vi.fn(),
    setCoords: vi.fn(),
    ...options
  } as FakeElement
  element.set.mockImplementation((keyOrValues: string | Record<string, unknown>, value?: unknown) => {
    if (typeof keyOrValues === 'string') (element as any)[keyOrValues] = value
    else Object.assign(element, keyOrValues)
    return element
  })
  return element
}

function installCanvas(element: FakeElement) {
  runtime.canvas = {
    getObjects: () => [element],
    requestRenderAll: vi.fn()
  }
}

describe('ElementManager position stability', () => {
  beforeEach(() => {
    runtime.canvas = null
    runtime.storedConfig = null
    runtime.upsertElement.mockReset()
    runtime.patchElement.mockReset()
  })

  it('restores a single element live and persisted position after an appearance update drifts it', async () => {
    const element = makeElement()
    installCanvas(element)
    runtime.storedConfig = { id: element.id, eleType: element.eleType, left: 320, top: 180, fill: '#FFFFFF' }
    registerElement(element.eleType, {
      add: vi.fn() as any,
      update: (target) => {
        target.set({ left: 0, top: 0 })
      },
      encode: (target) =>
        ({
          id: target.id,
          eleType: target.eleType,
          left: target.left,
          top: target.top,
          fill: '#FF0000'
        }) as any
    })

    await updateElement(element as any, { fill: '#FF0000' })

    expect(element).toMatchObject({ left: 137, top: 219 })
    expect(element.__element?.config).toMatchObject({ left: 320, top: 180 })
    expect(runtime.upsertElement).toHaveBeenLastCalledWith(expect.objectContaining({ left: 320, top: 180, fill: '#FF0000' }))
  })

  it('restores a group after child layout rewrites its position', async () => {
    const element = makeElement({
      id: 'stable-group',
      eleType: 'position-stability-group',
      type: 'group',
      left: -35,
      top: 18,
      __element: { config: { id: 'stable-group', eleType: 'position-stability-group', left: 180, top: 220 } }
    })
    installCanvas(element)
    runtime.storedConfig = { id: element.id, eleType: element.eleType, left: 180, top: 220, color: '#00FF00' }
    registerElement(element.eleType, {
      add: vi.fn() as any,
      update: (target) => {
        // Simulate Fabric FitContent recalculating a selected Group in parent-relative coordinates.
        target.set({ left: 0, top: 0 })
      },
      encode: (target) =>
        ({
          id: target.id,
          eleType: target.eleType,
          left: target.left,
          top: target.top,
          color: '#FF0000'
        }) as any
    })

    await updateElement(element as any, { color: '#FF0000' })

    expect(element).toMatchObject({ left: -35, top: 18 })
    expect(element.__element?.config).toMatchObject({ left: 180, top: 220 })
    expect(runtime.upsertElement).toHaveBeenLastCalledWith(expect.objectContaining({ left: 180, top: 220, color: '#FF0000' }))
  })

  it('allows only explicitly patched position axes to change', async () => {
    const element = makeElement({ id: 'explicit-position', eleType: 'position-stability-explicit' })
    installCanvas(element)
    runtime.storedConfig = { id: element.id, eleType: element.eleType, left: 137, top: 219 }
    registerElement(element.eleType, {
      add: vi.fn() as any,
      update: (target, patch) => {
        target.set({ left: patch.left, top: 0 })
      },
      encode: (target) => ({ id: target.id, eleType: target.eleType, left: target.left, top: target.top }) as any
    })

    await updateElement(element as any, { left: 240 })

    expect(element).toMatchObject({ left: 240, top: 219 })
    expect(runtime.upsertElement).toHaveBeenLastCalledWith(expect.objectContaining({ left: 240, top: 219 }))
  })

  it('persists a handler-normalized explicit position instead of the raw patch value', async () => {
    const element = makeElement({ id: 'normalized-position', eleType: 'position-stability-normalized' })
    installCanvas(element)
    runtime.storedConfig = { id: element.id, eleType: element.eleType, left: 137, top: 219 }
    registerElement(element.eleType, {
      add: vi.fn() as any,
      update: (target) => {
        target.set({ left: 454 })
      },
      encode: (target) => ({ id: target.id, eleType: target.eleType, left: target.left, top: target.top }) as any
    })

    await updateElement(element as any, { left: 999 })

    expect(element.left).toBe(454)
    expect(runtime.upsertElement).toHaveBeenLastCalledWith(expect.objectContaining({ left: 454, top: 219 }))
  })

  it('does not treat undefined position fields as an explicit move', async () => {
    const element = makeElement({ id: 'undefined-position', eleType: 'position-stability-undefined' })
    installCanvas(element)
    runtime.storedConfig = { id: element.id, eleType: element.eleType, left: 137, top: 219 }
    registerElement(element.eleType, {
      add: vi.fn() as any,
      update: (target) => {
        target.set({ left: 0, top: 0 })
      },
      encode: (target) => ({ id: target.id, eleType: target.eleType, left: target.left, top: target.top }) as any
    })

    await updateElement(element as any, { left: undefined, fill: '#FF0000' })

    expect(element).toMatchObject({ left: 137, top: 219 })
    expect(runtime.upsertElement).toHaveBeenLastCalledWith(expect.objectContaining({ left: 137, top: 219 }))
  })

  it('restores live position when an update fails without persisting partial state', async () => {
    const element = makeElement({ id: 'failed-position', eleType: 'position-stability-failure' })
    installCanvas(element)
    runtime.storedConfig = { id: element.id, eleType: element.eleType, left: 137, top: 219 }
    registerElement(element.eleType, {
      add: vi.fn() as any,
      update: (target) => {
        target.set({ left: 0, top: 0 })
        throw new Error('update failed')
      }
    })

    await expect(updateElement(element as any, { fill: '#FF0000' })).rejects.toThrow('update failed')

    expect(element).toMatchObject({ left: 137, top: 219 })
    expect(runtime.upsertElement).not.toHaveBeenCalled()
    expect(runtime.patchElement).not.toHaveBeenCalled()
  })
})
