import { beforeEach, describe, expect, it, vi } from 'vitest'
import { subDialSchema } from './subDial.schema'

const { add, addLayer, requestRenderAll, setActiveObject, upsertElement } = vi.hoisted(() => ({
  add: vi.fn(),
  addLayer: vi.fn(),
  requestRenderAll: vi.fn(),
  setActiveObject: vi.fn(),
  upsertElement: vi.fn(),
}))

vi.mock('fabric', () => {
  class FabricObject {
    [key: string]: any
    constructor(options: Record<string, any> = {}) { Object.assign(this, options) }
    set(key: string | Record<string, any>, value?: any) {
      if (typeof key === 'string') this[key] = value
      else Object.assign(this, key)
      return this
    }
    setCoords() {}
    on() {}
  }
  class Circle extends FabricObject {}
  class Line extends FabricObject {
    points: number[]
    constructor(points: number[], options = {}) { super(options); this.points = points }
  }
  class Triangle extends FabricObject {}
  class FabricText extends FabricObject {
    text: string
    constructor(text: string, options = {}) { super(options); this.text = text }
  }
  class FabricImage extends FabricObject {
    static fromURL = vi.fn(async () => new FabricImage({ width: 100, height: 200 }))
  }
  class Group extends FabricObject {
    objects: any[]
    constructor(objects: any[] = [], options = {}) { super(options); this.objects = [...objects] }
    getObjects() { return this.objects }
    add(child: any) { this.objects.push(child) }
    remove(child: any) { this.objects = this.objects.filter((item) => item !== child) }
  }
  return { Circle, Line, Triangle, Text: FabricText, Image: FabricImage, Group }
})

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas: { add, requestRenderAll, setActiveObject } }),
}))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ addLayer }) }))
vi.mock('@/stores/elementDataStore', () => ({ useElementDataStore: () => ({ upsertElement }) }))
vi.mock('@/utils/controlManager', () => ({ applyControlsToObject: vi.fn() }))

import { createSubDial, updateSubDial } from './subDial.renderer'

function makeConfig(overrides: Record<string, any> = {}) {
  return {
    ...subDialSchema.defaultConfig,
    id: 'sub-dial-1',
    eleType: 'subDial' as const,
    pointer: { ...subDialSchema.defaultConfig.pointer },
    ...overrides,
  }
}

describe('subDial renderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates one group with stable named children', async () => {
    const dial = await createSubDial(makeConfig() as any)

    expect((dial as any).__element.children).toMatchObject({
      background: expect.anything(),
      majorTicks: expect.anything(),
      minorTicks: expect.anything(),
      pointer: expect.anything(),
      centerCap: expect.anything(),
      valueText: expect.anything(),
      unitText: expect.anything(),
    })
    expect(add).toHaveBeenCalledWith(dial)
    expect(addLayer).toHaveBeenCalledWith(dial)
    expect(upsertElement).toHaveBeenCalledTimes(1)
  })

  it('updates dynamic children without rebuilding static ticks', async () => {
    const dial = await createSubDial(makeConfig() as any)
    const beforeTicks = (dial as any).__element.children.majorTicks

    await updateSubDial(dial as any, { previewValue: 75 })

    expect((dial as any).__element.children.majorTicks).toBe(beforeTicks)
    expect((dial as any).__element.children.pointer.angle).toBe(420)
    expect((dial as any).__element.children.valueText.text).toBe('75')
  })

  it('aligns an image pivot with the local dial center', async () => {
    const dial = await createSubDial(makeConfig({
      pointer: {
        ...subDialSchema.defaultConfig.pointer,
        style: 'image',
        imageUrl: 'https://assets.example/pointer.png',
        pivotX: 0.5,
        pivotY: 0.85,
      },
    }) as any)
    const pointer = (dial as any).__element.children.pointer
    const image = pointer.getObjects()[0]

    expect(pointer.left).toBe(0)
    expect(pointer.top).toBe(0)
    expect(pointer.angle).toBe(360)
    expect(image.left).toBe(0)
    expect(image.top).toBeCloseTo(-13.44)
  })
})
