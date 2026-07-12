import { beforeEach, describe, expect, it, vi } from 'vitest'
import { subDialSchema } from './subDial.schema'
import { migrateSubDialConfig } from './subDial.migration'

const { add, addLayer, requestRenderAll, setActiveObject, upsertElement } = vi.hoisted(() => ({
  add: vi.fn(),
  addLayer: vi.fn(),
  requestRenderAll: vi.fn(),
  setActiveObject: vi.fn(),
  upsertElement: vi.fn()
}))

vi.mock('fabric', () => {
  class FabricObject {
    [key: string]: any
    constructor(options: Record<string, any> = {}) {
      Object.assign(this, options)
    }
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
    constructor(points: number[], options = {}) {
      super(options)
      this.points = points
    }
  }
  class Triangle extends FabricObject {}
  class FabricText extends FabricObject {
    text: string
    constructor(text: string, options = {}) {
      super(options)
      this.text = text
    }
  }
  class FabricImage extends FabricObject {
    static fromURL = vi.fn(async () => new FabricImage({ width: 100, height: 200 }))
  }
  class Group extends FabricObject {
    objects: any[]
    constructor(objects: any[] = [], options = {}) {
      super(options)
      this.objects = [...objects]
    }
    getObjects() {
      return this.objects
    }
    add(child: any) {
      this.objects.push(child)
      if (this.eleType === 'subDial') this.set({ left: 0, top: 0 })
    }
    remove(child: any) {
      this.objects = this.objects.filter((item) => item !== child)
      if (this.eleType === 'subDial') this.set({ left: 0, top: 0 })
    }
    insertAt(index: number, ...children: any[]) {
      this.objects.splice(index, 0, ...children)
      return children.length
    }
  }
  return { Circle, Line, Triangle, Text: FabricText, Image: FabricImage, Group }
})

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas: { add, requestRenderAll, setActiveObject } })
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
    ...overrides
  }
}

describe('subDial renderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates one group with stable static and content children', async () => {
    const dial = await createSubDial(makeConfig() as any)

    expect((dial as any).__element.children).toMatchObject({
      static: {
        background: expect.anything(),
        majorTicks: expect.anything(),
        minorTicks: expect.anything(),
        tickLabels: expect.anything(),
        pointer: expect.anything(),
        centerCap: expect.anything()
      },
      content: {
        icon: expect.anything(),
        label: expect.anything(),
        value: expect.anything(),
        unit: expect.anything(),
        goalValue: expect.anything(),
        percentage: expect.anything()
      }
    })
    expect(Object.entries((dial as any).__element.children.content).map(([key, child]: any) => [key, child.subDialContentKey])).toEqual([
      ['icon', 'icon'],
      ['label', 'label'],
      ['value', 'value'],
      ['unit', 'unit'],
      ['goalValue', 'goalValue'],
      ['percentage', 'percentage']
    ])
    expect(add).toHaveBeenCalledWith(dial)
    expect(addLayer).toHaveBeenCalledWith(dial)
    expect(upsertElement).toHaveBeenCalledTimes(1)
  })

  it('updates dynamic children without rebuilding static ticks', async () => {
    const dial = await createSubDial(makeConfig() as any)
    const { static: staticChildren, content } = (dial as any).__element.children
    const beforeContent = { ...content }

    await updateSubDial(dial as any, { previewValue: 75 })

    expect((dial as any).__element.children.static.majorTicks).toBe(staticChildren.majorTicks)
    expect((dial as any).__element.children.static.pointer).toBe(staticChildren.pointer)
    expect((dial as any).__element.children.static.pointer.angle).toBe(420)
    expect((dial as any).__element.children.content).toEqual(beforeContent)
    expect((dial as any).__element.children.content.value.text).toBe('75')
  })

  it('updates content style and position in place using the new content config', async () => {
    const dial = await createSubDial(makeConfig() as any)
    const value = (dial as any).__element.children.content.value
    await updateSubDial(
      dial as any,
      {
        content: {
          value: {
            visible: true,
            x: 0.25,
            y: -0.4,
            rotation: 12,
            scale: 1.5,
            color: '#12AB34',
            font: 'Inter',
            fontSize: 19,
            textAlign: 'right',
            prefix: '$',
            suffix: 'k',
            decimals: 1
          }
        }
      } as any
    )
    expect((dial as any).__element.children.content.value).toBe(value)
    expect(value).toMatchObject({ text: '$50.0k', left: 12, angle: 12, scaleX: 1.5, scaleY: 1.5, fill: '#12AB34', fontFamily: 'Inter', fontSize: 19, textAlign: 'right' })
    expect(value.top).toBeCloseTo(-19.2)
  })

  it('applies each content item layout and presentation contract', async () => {
    const base = subDialSchema.defaultConfig.content
    const content = {
      icon: { ...base.icon, visible: true, x: -0.4, y: -0.6, rotation: 1, scale: 1.1, color: '#111111', size: 17, displayType: 'amoled' },
      label: { ...base.label, visible: false, x: -0.3, y: -0.2, rotation: 2, scale: 1.2, color: '#222222', fontSize: 12, textAlign: 'left', prefix: '[', suffix: ']' },
      value: { ...base.value, visible: true, x: -0.1, y: 0.1, rotation: 3, scale: 1.3, color: '#333333', fontSize: 13, textAlign: 'right', prefix: '$', suffix: 'v', decimals: 1 },
      unit: { ...base.unit, visible: true, x: 0.1, y: 0.2, rotation: 4, scale: 1.4, color: '#444444', fontSize: 14, textAlign: 'center', prefix: '<', suffix: 'km' },
      goalValue: { ...base.goalValue, visible: true, x: 0.3, y: 0.4, rotation: 5, scale: 1.5, color: '#555555', fontSize: 15, textAlign: 'left', prefix: 'G', suffix: '!' },
      percentage: { ...base.percentage, visible: true, x: 0.5, y: 0.6, rotation: 6, scale: 1.6, color: '#666666', fontSize: 16, textAlign: 'right', prefix: 'P', suffix: '%' }
    }
    const dial = await createSubDial(makeConfig({ progressProperty: 'steps', content }) as any)
    const rendered = (dial as any).__element.children.content

    expect(rendered.icon).toMatchObject({ text: '●', visible: true, angle: 1, scaleX: 1.1, scaleY: 1.1, fill: '#111111', fontSize: 17, subDialIconDisplayType: 'amoled' })
    expect(rendered.icon.left).toBeCloseTo(-19.2)
    expect(rendered.icon.top).toBeCloseTo(-28.8)
    const expected = {
      label: { text: '[steps]', visible: false, x: -14.4, y: -9.6, angle: 2, scale: 1.2, color: '#222222', fontSize: 12, align: 'left' },
      value: { text: '$50.0v', visible: true, x: -4.8, y: 4.8, angle: 3, scale: 1.3, color: '#333333', fontSize: 13, align: 'right' },
      unit: { text: '<km', visible: true, x: 4.8, y: 9.6, angle: 4, scale: 1.4, color: '#444444', fontSize: 14, align: 'center' },
      goalValue: { text: 'G100!', visible: true, x: 14.4, y: 19.2, angle: 5, scale: 1.5, color: '#555555', fontSize: 15, align: 'left' },
      percentage: { text: 'P50%', visible: true, x: 24, y: 28.8, angle: 6, scale: 1.6, color: '#666666', fontSize: 16, align: 'right' }
    }
    for (const [key, item] of Object.entries(expected)) {
      const child = rendered[key]
      expect(child).toMatchObject({
        text: item.text,
        visible: item.visible,
        angle: item.angle,
        scaleX: item.scale,
        scaleY: item.scale,
        fill: item.color,
        fontSize: item.fontSize,
        textAlign: item.align
      })
      expect(child.left).toBeCloseTo(item.x)
      expect(child.top).toBeCloseTo(item.y)
    }

    await updateSubDial(dial as any, { progressProperty: '' })
    expect(rendered.icon.text).toBe('○')
  })

  it.each([
    { name: 'percentage range', config: { previewValue: 50 }, expected: '50%' },
    { name: 'custom range midpoint', config: { progressMode: 'custom', customMin: 20, customMax: 60, previewValue: 40 }, expected: '50%' }
  ])('formats normalized progress for $name', async ({ config, expected }) => {
    const dial = await createSubDial(makeConfig(config) as any)
    expect((dial as any).__element.children.content.percentage.text).toBe(expected)
  })

  it('repositions content in place when radius changes and only rebuilds static geometry', async () => {
    const dial = await createSubDial(makeConfig() as any)
    const children = (dial as any).__element.children
    const value = children.content.value
    const background = children.static.background
    await updateSubDial(dial as any, { radius: 72 })
    expect(children.content.value).toBe(value)
    expect(value.top).toBe(14.4)
    expect(children.static.background).not.toBe(background)
  })

  it('shows generated major tick labels only when enabled', async () => {
    const dial = await createSubDial(makeConfig({ showTickLabels: false, majorTicks: 3 }) as any)
    const beforeContent = (dial as any).__element.children.content.value
    expect((dial as any).__element.children.static.tickLabels.getObjects()).toHaveLength(0)
    await updateSubDial(dial as any, { showTickLabels: true })
    const labels = (dial as any).__element.children.static.tickLabels.getObjects()
    expect(labels.map((label: any) => label.text)).toEqual(['0', '50', '100'])
    const labelRadius = subDialSchema.defaultConfig.radius * 0.67
    ;[150, 270, 390].forEach((angle, index) => {
      const radians = (angle * Math.PI) / 180
      expect(labels[index].left).toBeCloseTo(Math.cos(radians) * labelRadius)
      expect(labels[index].top).toBeCloseTo(Math.sin(radians) * labelRadius)
    })
    expect((dial as any).__element.children.content.value).toBe(beforeContent)
  })

  it('rebuilds only affected static structures without invalidating content references', async () => {
    const dial = await createSubDial(makeConfig() as any)
    const children = (dial as any).__element.children
    const content = { ...children.content }
    const pointer = children.static.pointer
    const minorTicks = children.static.minorTicks
    await updateSubDial(dial as any, { majorTicks: 8 })
    expect(children.static.minorTicks).toBe(minorTicks)
    expect(children.static.pointer).toBe(pointer)
    expect(children.content).toEqual(content)
    await updateSubDial(dial as any, { pointer: { color: '#00FF00' } } as any)
    expect(children.static.pointer).not.toBe(pointer)
    expect(children.content).toEqual(content)
  })

  it('hides invalid progress-only objects while leaving configured source content visible', async () => {
    const dial = await createSubDial(makeConfig({ previewValue: 200, outOfRangeBehavior: 'hide' }) as any)
    const { static: staticChildren, content } = (dial as any).__element.children
    expect(staticChildren.pointer.visible).toBe(false)
    expect(content.goalValue.visible).toBe(false)
    expect(content.percentage.visible).toBe(false)
    expect(content.icon.visible).toBe(true)
    expect(content.label.visible).toBe(true)
    expect(content.value.visible).toBe(true)
    expect(content.unit.visible).toBe(true)
  })

  it('preserves canvas position when a settings change rebuilds group children', async () => {
    const dial = await createSubDial(makeConfig({ left: 120, top: 180, rotation: 15 }) as any)

    await updateSubDial(dial as any, { majorTicks: 8 })

    expect(dial).toMatchObject({ left: 120, top: 180, angle: 15 })
    expect((dial as any).__element.config).toMatchObject({ left: 120, top: 180, rotation: 15 })
    expect(upsertElement).toHaveBeenLastCalledWith(expect.objectContaining({ left: 120, top: 180, rotation: 15 }))
  })

  it('aligns an image pivot with the local dial center', async () => {
    const dial = await createSubDial(
      makeConfig({
        pointer: {
          ...subDialSchema.defaultConfig.pointer,
          style: 'image',
          imageUrl: 'https://assets.example/pointer.png',
          pivotX: 0.5,
          pivotY: 0.85
        }
      }) as any
    )
    const pointer = (dial as any).__element.children.static.pointer
    const image = pointer.getObjects()[0]

    expect(pointer.left).toBe(0)
    expect(pointer.top).toBe(0)
    expect(pointer.angle).toBe(360)
    expect(image.left).toBe(0)
    expect(image.top).toBeCloseTo(-13.44)
  })

  it('rotates a triangle pointer around the local dial center', async () => {
    const dial = await createSubDial(
      makeConfig({
        pointer: {
          ...subDialSchema.defaultConfig.pointer,
          style: 'triangle',
          lengthRatio: 0.75
        }
      }) as any
    )
    const pointer = (dial as any).__element.children.static.pointer
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

  it.each([{ progressProperty: '' }, { goalProperty: '' }])('clears a binding when an own empty patch is provided: %o', async (patch) => {
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
        unit: { visible: true, suffix: 'STEPS', color: '#00AA00', fontSize: 11 }
      }
    })

    const dial = await createSubDial(config)
    const { value, unit } = (dial as any).__element.children.content

    expect(value).toMatchObject({ text: '12.3', visible: true, fill: '#00FF00', fontSize: 18 })
    expect(unit).toMatchObject({ text: 'STEPS', visible: true, fill: '#00AA00', fontSize: 11 })
    expect(upsertElement).toHaveBeenLastCalledWith(expect.objectContaining({ progressProperty: 'steps' }))
  })
})
