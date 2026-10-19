import { beforeEach, describe, expect, it, vi } from 'vitest'

const { patchElement, requestRenderAll } = vi.hoisted(() => ({
  patchElement: vi.fn(),
  requestRenderAll: vi.fn(),
}))

vi.mock('fabric', () => {
  class FabricObject {
    [key: string]: any

    constructor(options: Record<string, any> = {}) {
      Object.assign(this, options)
    }

    set(values: Record<string, any>) {
      Object.assign(this, values)
      return this
    }

    setCoords() {}
  }

  class Circle extends FabricObject {}

  class Group extends FabricObject {
    objects: any[]

    constructor(objects: any[] = [], options: Record<string, any> = {}) {
      super(options)
      this.objects = [...objects]
    }

    getObjects() {
      return this.objects
    }
  }

  return { Circle, Group }
})

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas: { requestRenderAll } }),
}))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ addLayer: vi.fn() }) }))
vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({ patchElement, upsertElement: vi.fn() }),
}))
vi.mock('@/utils/controlManager', () => ({ applyControlsToObject: vi.fn() }))

import { Circle, Group } from 'fabric'
import { updateGoalArc } from './goalArc.renderer'

function createSelectedGoalArc() {
  const bgRing = new Circle({ id: 'goal-arc_bg', visible: true, opacity: 1 })
  const mainRing = new Circle({ id: 'goal-arc_main', visible: true, opacity: 1 })
  const config = {
    id: 'goal-arc',
    eleType: 'goalArc',
    left: 180,
    top: 220,
    originX: 'center',
    originY: 'center',
    startAngle: 0,
    endAngle: 359,
    radius: 50,
    bgRadius: 50,
    strokeWidth: 4,
    bgStrokeWidth: 4,
    color: '#00FF00',
    bgColor: '#333333',
    counterClockwise: false,
    goalProperty: 'goal_1',
    progress: 0.5,
    segmentMode: false,
    segments: 12,
    gapAngle: 2,
    endCap: 'round',
    gradientEnabled: false,
    gradientStartColor: '#00FF00',
    gradientEndColor: '#00FFFF',
  }
  const group = new Group([bgRing, mainRing], {
    id: 'goal-arc',
    eleType: 'goalArc',
    // Fabric ActiveSelection 内部暂存的是相对坐标，不能在属性绑定时重算或持久化。
    left: -35,
    top: 18,
    visible: true,
    goalProperty: 'goal_1',
    progress: 0.5,
    segmentMode: false,
  } as any) as any
  group.__element = {
    kind: 'widget',
    type: 'goalArc',
    config,
    children: { bgRing, mainRing },
  }
  group._calcBounds = vi.fn()
  group._updateObjectsCoords = vi.fn()
  group._onAfterObjectsChange = vi.fn()

  return { group, config }
}

describe('goal arc updates', () => {
  beforeEach(() => {
    patchElement.mockClear()
    requestRenderAll.mockClear()
  })

  it('keeps the selected arc position and visibility when only its goal binding changes', () => {
    const { group } = createSelectedGoalArc()

    updateGoalArc(group, { goalProperty: 'goal_2' })

    expect(group.left).toBe(-35)
    expect(group.top).toBe(18)
    expect(group.visible).toBe(true)
    expect(group._calcBounds).not.toHaveBeenCalled()
    expect(group._updateObjectsCoords).not.toHaveBeenCalled()
    expect(group._onAfterObjectsChange).not.toHaveBeenCalled()
    expect(group.goalProperty).toBe('goal_2')
    expect(group.__element.config).toMatchObject({ left: 180, top: 220, goalProperty: 'goal_2' })
    expect(patchElement).toHaveBeenCalledWith(
      'goal-arc',
      expect.objectContaining({ left: 180, top: 220, goalProperty: 'goal_2' }),
    )
  })

  it('restores the live position after a non-position setting relayout', () => {
    const { group } = createSelectedGoalArc()

    updateGoalArc(group, { color: '#FF0000' })

    expect(group._calcBounds).toHaveBeenCalledTimes(1)
    expect(group.left).toBe(-35)
    expect(group.top).toBe(18)
    expect(group.visible).toBe(true)
    expect(group.__element.config).toMatchObject({
      left: 180,
      top: 220,
      color: '#FF0000',
    })
    expect(patchElement).toHaveBeenCalledWith(
      'goal-arc',
      expect.objectContaining({ left: 180, top: 220, color: '#FF0000' }),
    )
  })

  it('updates the position when an explicit drag position is committed', () => {
    const { group } = createSelectedGoalArc()

    updateGoalArc(group, { left: 240, top: 260 })

    expect(group.left).toBe(240)
    expect(group.top).toBe(260)
    expect(group.__element.config).toMatchObject({ left: 240, top: 260 })
    expect(patchElement).toHaveBeenCalledWith(
      'goal-arc',
      expect.objectContaining({ left: 240, top: 260 }),
    )
  })
})


describe('full circle goal arcs', () => {
  for (const counterClockwise of [false, true]) {
    for (const progress of [0, 0.41, 1]) {
      it(`draws equal angles as a full track, direction=${counterClockwise}, progress=${progress}`, () => {
        const { group } = createSelectedGoalArc()
        updateGoalArc(group, { startAngle: 270, endAngle: 270, counterClockwise, progress })
        const { bgRing, mainRing } = group.__element.children
        const sweep = counterClockwise ? -360 : 360
        expect(bgRing.endAngle - bgRing.startAngle).toBe(sweep)
        expect(mainRing.endAngle - mainRing.startAngle).toBeCloseTo(sweep * progress)
        expect(group.__element.config.endAngle).toBe(270)
      })
    }
    it(`draws a complete gradient, direction=${counterClockwise}`, () => {
      const { group } = createSelectedGoalArc()
      updateGoalArc(group, { startAngle: 270, endAngle: 270, counterClockwise,
        gradientEnabled: true, progress: 1, endCap: 'butt' })
      const ctx = { save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), stroke: vi.fn() }
      group.drawObject(ctx)
      expect(ctx.arc).toHaveBeenCalledTimes(90)
      const calls = ctx.arc.mock.calls
      expect(calls[calls.length - 1][4] - calls[0][3]).toBeCloseTo(counterClockwise ? -2 * Math.PI : 2 * Math.PI)
    })
    it(`draws all segments around equal angles, direction=${counterClockwise}`, () => {
      const { group } = createSelectedGoalArc()
      updateGoalArc(group, { startAngle: 270, endAngle: 270, counterClockwise,
        segmentMode: true, segments: 4, gapAngle: 0, progress: 1, endCap: 'butt' })
      const ctx = { save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), stroke: vi.fn() }
      group.drawObject(ctx)
      expect(ctx.arc).toHaveBeenCalledTimes(8)
      const sweep = counterClockwise ? -Math.PI / 2 : Math.PI / 2
      for (const call of ctx.arc.mock.calls) expect(call[4] - call[3]).toBeCloseTo(sweep)
    })
  }
})
