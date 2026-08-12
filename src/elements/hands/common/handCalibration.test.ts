import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  canvas: null as any,
  patchElement: vi.fn(),
  saveState: vi.fn(),
}))

const fabric = vi.hoisted(() => {
  class FabricObject {
    [key: string]: any

    constructor(props: Record<string, any> = {}) {
      Object.assign(this, props)
    }

    set(props: Record<string, any>) {
      Object.assign(this, props)
      return this
    }

    setCoords() {}
  }

  class Group extends FabricObject {
    children: any[]

    constructor(children: any[], props: Record<string, any>) {
      super(props)
      this.children = children
    }
  }

  class Circle extends FabricObject {}
  class Line extends FabricObject {
    points: number[]

    constructor(points: number[], props: Record<string, any>) {
      super(props)
      this.points = points
    }
  }

  return { FabricObject, Group, Circle, Line }
})

vi.mock('fabric', () => ({ Circle: fabric.Circle, Group: fabric.Group, Line: fabric.Line }))
vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => ({ canvas: mocks.canvas }) }))
vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({ patchElement: mocks.patchElement }),
}))
vi.mock('@/stores/historyStore', () => ({
  useHistoryStore: () => ({
    saveState: mocks.saveState,
    runWithoutRecording: (operation: () => unknown) => operation(),
  }),
}))

import {
  handCalibrationState,
  startHandCalibration,
  stopHandCalibration,
  syncHandCalibrationMarker,
} from './handCalibration'

function hand(id: string, eleType: string) {
  return new fabric.FabricObject({
    id,
    eleType,
    centerX: 227,
    centerY: 227,
    left: 227,
    top: 227,
    pivotOffsetX: 0,
    pivotOffsetY: 0,
    selectable: true,
    evented: true,
    lockMovementX: false,
    lockMovementY: false,
    hasBorders: true,
    hasControls: true,
    angle: eleType === 'hourHand' ? 30 : 60,
  })
}

describe('hand calibration interaction modes', () => {
  beforeEach(() => {
    stopHandCalibration()
    const objects = [hand('hour-1', 'hourHand'), hand('minute-1', 'minuteHand')]
    mocks.canvas = {
      objects,
      preserveObjectStacking: false,
      getObjects: () => objects,
      getActiveObject: () => objects[0],
      setActiveObject: vi.fn(),
      add: (object: any) => objects.push(object),
      remove: (object: any) => objects.splice(objects.indexOf(object), 1),
      bringObjectToFront: vi.fn(),
      requestRenderAll: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }
  })

  it('points only the selected hand at 12 and shows a non-interactive cross above it', () => {
    expect(startHandCalibration('minute-1')).toBe(true)

    const [hour, minute, marker] = mocks.canvas.objects
    expect(hour).toMatchObject({ selectable: false, evented: false })
    expect(hour.angle).toBe(30)
    expect(minute).toMatchObject({ selectable: true, evented: true })
    expect(minute.angle).toBe(0)
    expect(marker).toMatchObject({ eleType: 'handCalibrationPivot', handId: 'minute-1', evented: false })
    expect(marker.children).toHaveLength(2)
    expect(marker.children.every((child: any) => child instanceof fabric.Line)).toBe(true)
    expect(mocks.canvas.bringObjectToFront).toHaveBeenCalledWith(marker)
    expect(mocks.canvas.preserveObjectStacking).toBe(true)
    expect(mocks.canvas.on).not.toHaveBeenCalledWith('mouse:down', expect.any(Function))
  })

  it('restores the selected hand angle when calibration finishes', () => {
    startHandCalibration('minute-1')
    stopHandCalibration()
    expect(mocks.canvas.objects[1].angle).toBe(60)
    expect(mocks.canvas.preserveObjectStacking).toBe(false)
  })

  it('moves the marker binding when calibration switches to another hand', () => {
    startHandCalibration('minute-1')
    startHandCalibration('hour-1')

    const marker = mocks.canvas.objects.at(-1)
    expect(marker).toMatchObject({ handId: 'hour-1' })
    expect(handCalibrationState.selectedHandId).toBe('hour-1')
  })

  it('syncs the marker when coordinates are edited in settings', () => {
    startHandCalibration('minute-1')
    syncHandCalibrationMarker('minute-1', { x: 240, y: 245 })

    expect(mocks.canvas.objects.at(-1)).toMatchObject({ left: 240, top: 245 })
  })

  it('keeps the crosshair fixed while the hand material moves', () => {
    startHandCalibration('minute-1')
    const minute = mocks.canvas.objects[1]
    const marker = mocks.canvas.objects.at(-1)
    const moving = mocks.canvas.on.mock.calls.find(([event]: [string]) => event === 'object:moving')?.[1]

    minute.left = 240
    minute.top = 250
    moving({ target: minute })

    expect(marker).toMatchObject({ left: 227, top: 227 })
    expect(minute).toMatchObject({
      centerX: 240,
      centerY: 250,
      pivotOffsetX: -13,
      pivotOffsetY: -23,
    })
  })
})
