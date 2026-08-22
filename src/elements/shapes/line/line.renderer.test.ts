import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const objects: any[] = []
  const handlers: Record<string, (event: any) => void> = {}
  const canvas: any = {
    add: vi.fn((object: any) => {
      objects.push(object)
      object.canvas = canvas
    }),
    remove: vi.fn((object: any) => {
      const index = objects.indexOf(object)
      if (index >= 0) objects.splice(index, 1)
    }),
    getPointer: vi.fn((event: any) => event),
    on: vi.fn((event: string, handler: (payload: any) => void) => {
      handlers[event] = handler
    }),
    off: vi.fn((event: string, handler: (payload: any) => void) => {
      if (handlers[event] === handler) delete handlers[event]
    }),
    renderAll: vi.fn(),
    requestRenderAll: vi.fn(),
    setActiveObject: vi.fn(),
  }
  return {
    objects,
    handlers,
    canvas,
    addLayer: vi.fn(),
    upsertElement: vi.fn(),
    patchElement: vi.fn(),
  }
})

vi.mock('fabric', () => {
  class Control {
    [key: string]: any
    constructor(options: Record<string, any> = {}) { Object.assign(this, options) }
  }

  class Rect {
    [key: string]: any
    controls: Record<string, any>

    constructor(options: Record<string, any> = {}) {
      Object.assign(this, options)
      this.controls = { mtr: new Control({ actionName: 'rotate' }) }
    }

    set(keyOrValues: string | Record<string, any>, value?: any) {
      if (typeof keyOrValues === 'string') this[keyOrValues] = value
      else Object.assign(this, keyOrValues)
      return this
    }

    setCoords() {}
  }

  return { Control, Rect }
})

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas: mocks.canvas }),
}))
vi.mock('@/stores/layerStore', () => ({
  useLayerStore: () => ({ previewMode: 'active', addLayer: mocks.addLayer }),
}))
vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({
    upsertElement: mocks.upsertElement,
    patchElement: mocks.patchElement,
  }),
}))

import { createLine, startDrawingLine, updateLine } from './line.renderer'

const lineConfig = {
  id: 'line-1',
  eleType: 'line' as const,
  left: 50,
  top: 0,
  originX: 'center' as const,
  originY: 'center' as const,
  x1: 0,
  y1: 0,
  x2: 100,
  y2: 0,
  stroke: '#ffffff',
  strokeWidth: 2,
  opacity: 1,
}

describe('line renderer axis snapping', () => {
  afterEach(() => {
    mocks.objects.splice(0)
    Object.keys(mocks.handlers).forEach(key => delete mocks.handlers[key])
    vi.clearAllMocks()
  })

  it('configures rotation to snap only near horizontal and vertical axes', async () => {
    const line = await createLine(lineConfig) as any

    expect(line.snapAngle).toBe(90)
    expect(line.snapThreshold).toBe(2)
  })

  it('snaps endpoint dragging exactly onto a nearby horizontal axis', async () => {
    const line = await createLine(lineConfig) as any

    line.controls.mr.actionHandler({}, { target: line }, 150, 3)

    expect(line.angle).toBe(0)
    expect(line.top).toBe(0)
  })

  it('keeps a drawn line free when its angle is outside the axis threshold', () => {
    startDrawingLine(mocks.canvas, lineConfig)
    mocks.handlers['mouse:down']({ e: { x: 0, y: 0 } })
    mocks.handlers['mouse:move']({ e: { x: 100, y: 20 } })

    expect(mocks.objects[0].angle).toBeCloseTo(11.3099, 3)
  })

  it('normalizes endpoint coordinate updates onto a nearby horizontal axis', async () => {
    const line = await createLine(lineConfig) as any

    updateLine(line, { x1: 0, y1: 0, x2: 100, y2: 3 })

    expect(line.angle).toBe(0)
    expect(line.top).toBe(0)
  })
})
