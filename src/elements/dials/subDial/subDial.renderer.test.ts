import { beforeEach, describe, expect, it, vi } from 'vitest'
import { subDialSchema } from './subDial.schema'
import { migrateSubDialConfig } from './subDial.migration'

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
    add(child: any) {
      this.objects.push(child)
      if (this.eleType === 'subDial') this.set({ left: 0, top: 0 })
    }
    remove(child: any) {
      this.objects = this.objects.filter((item) => item !== child)
      if (this.eleType === 'subDial') this.set({ left: 0, top: 0 })
    }
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

  it('preserves canvas position when a settings change rebuilds group children', async () => {
    const dial = await createSubDial(makeConfig({ left: 120, top: 180, rotation: 15 }) as any)

    await updateSubDial(dial as any, { majorTicks: 8 })

    expect(dial).toMatchObject({ left: 120, top: 180, angle: 15 })
    expect((dial as any).__element.config).toMatchObject({ left: 120, top: 180, rotation: 15 })
    expect(upsertElement).toHaveBeenLastCalledWith(expect.objectContaining({ left: 120, top: 180, rotation: 15 }))
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

  it('rotates a triangle pointer around the local dial center', async () => {
    const dial = await createSubDial(makeConfig({
      pointer: {
        ...subDialSchema.defaultConfig.pointer,
        style: 'triangle',
        lengthRatio: 0.75,
      },
    }) as any)
    const pointer = (dial as any).__element.children.pointer
    const triangle = pointer.getObjects().find((child: any) => child.height === 36)

    expect(pointer).toMatchObject({ left: 0, top: 0, originX: 'center', originY: 'center' })
    expect(pointer.angle).toBe(360)
    expect(triangle).toMatchObject({ left: 0, top: -18, height: 36 })
  })

  it('migrates a legacy binding into the live and stored progress property', async () => {
    const { progressProperty: _progressProperty, ...legacyConfig } = makeConfig({ goalProperty: 'goal_1' })
    const dial = await createSubDial(legacyConfig as any)

    expect((dial as any).progressProperty).toBe('goal_1')
    await updateSubDial(dial, { progressProperty: 'goal_2' })
    expect((dial as any).progressProperty).toBe('goal_2')
    expect((dial as any).__element.config.progressProperty).toBe('goal_2')
    expect(upsertElement).toHaveBeenLastCalledWith(expect.not.objectContaining({ goalProperty: expect.anything() }))
  })

  it('treats an explicit non-empty legacy binding patch as the latest binding update', async () => {
    const dial = await createSubDial(makeConfig({ progressProperty: 'existing_goal' }) as any)

    await updateSubDial(dial, { goalProperty: 'new_goal' })

    expect((dial as any).progressProperty).toBe('new_goal')
    expect((dial as any).__element.config.progressProperty).toBe('new_goal')
    expect(upsertElement).toHaveBeenLastCalledWith(expect.objectContaining({ progressProperty: 'new_goal' }))
    expect(upsertElement).toHaveBeenLastCalledWith(expect.not.objectContaining({ goalProperty: expect.anything() }))
  })

  it.each([
    { progressProperty: '' },
    { goalProperty: '' },
  ])('clears a binding when an own empty patch is provided: %o', async (patch) => {
    const dial = await createSubDial(makeConfig({ progressProperty: 'existing_goal' }) as any)

    await updateSubDial(dial, patch)

    expect((dial as any).progressProperty).toBe('')
    expect((dial as any).__element.config.progressProperty).toBe('')
    expect(upsertElement).toHaveBeenLastCalledWith(expect.objectContaining({ progressProperty: '' }))
    expect(upsertElement).toHaveBeenLastCalledWith(expect.not.objectContaining({ goalProperty: expect.anything() }))
  })

  it('renders new-only content ahead of conflicting legacy presentation fields', async () => {
    const config = migrateSubDialConfig({
      progressProperty: 'steps',
      previewValue: 12.34,
      showValue: false,
      showUnit: false,
      unit: 'OLD',
      decimals: 0,
      valueColor: '#FF0000',
      valueFontSize: 8,
      content: {
        value: { visible: true, decimals: 1, color: '#00FF00', fontSize: 18 },
        unit: { visible: true, suffix: 'STEPS', color: '#00AA00', fontSize: 11 },
      },
    })

    const dial = await createSubDial(config)
    const { valueText, unitText } = (dial as any).__element.children

    expect(valueText).toMatchObject({ text: '12.3', visible: true, fill: '#00FF00', fontSize: 18 })
    expect(unitText).toMatchObject({ text: 'STEPS', visible: true, fill: '#00AA00', fontSize: 11 })
    expect(upsertElement).toHaveBeenLastCalledWith(expect.objectContaining({ progressProperty: 'steps' }))
  })
})
