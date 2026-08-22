// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  canvas: null as any,
  patchElement: vi.fn(),
  saveState: vi.fn(),
  activeObject: null as any,
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
    mocks.activeObject = objects[0]
    mocks.patchElement.mockClear()
    mocks.saveState.mockClear()
    mocks.canvas = {
      objects,
      preserveObjectStacking: false,
      getObjects: () => objects,
      getActiveObject: () => mocks.activeObject,
      setActiveObject: vi.fn((object: any) => { mocks.activeObject = object }),
      add: (object: any) => objects.push(object),
      remove: (object: any) => objects.splice(objects.indexOf(object), 1),
      bringObjectToFront: vi.fn(),
      requestRenderAll: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }
  })

  it('points only the selected hand at 12 and shows a draggable crosshair with an enlarged hit target', () => {
    expect(startHandCalibration('minute-1')).toBe(true)

    const [hour, minute, marker] = mocks.canvas.objects
    expect(hour).toMatchObject({ selectable: false, evented: false })
    expect(hour.angle).toBe(30)
    expect(minute).toMatchObject({ selectable: true, evented: true })
    expect(minute.angle).toBe(0)
    expect(marker).toMatchObject({
      eleType: 'handCalibrationPivot',
      handId: 'minute-1',
      selectable: true,
      evented: true,
      hoverCursor: 'crosshair',
    })
    expect(marker.children).toHaveLength(3)
    expect(marker.children[0]).toBeInstanceOf(fabric.Circle)
    expect(marker.children[0]).toMatchObject({ radius: 18, fill: 'rgba(0,0,0,0)' })
    expect(marker.children.slice(1).every((child: any) => child instanceof fabric.Line)).toBe(true)
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

  it('moves the pivot without moving the hand material when the crosshair is dragged', () => {
    startHandCalibration('minute-1')
    const minute = mocks.canvas.objects[1]
    const marker = mocks.canvas.objects.at(-1)
    const moving = mocks.canvas.on.mock.calls.find(([event]: [string]) => event === 'object:moving')?.[1]

    marker.left = 240
    marker.top = 245
    moving({ target: marker })

    expect(marker).toMatchObject({ left: 240, top: 245 })
    expect(minute).toMatchObject({
      centerX: 227,
      centerY: 227,
      pivotOffsetX: 13,
      pivotOffsetY: 18,
      rotationCenter: { x: 240, y: 245 },
    })
  })

  it('nudges the selected crosshair by one pixel and the selected pointer by ten pixels', () => {
    startHandCalibration('minute-1')
    const minute = mocks.canvas.objects[1]
    const marker = mocks.canvas.objects.at(-1)

    mocks.activeObject = marker
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }))
    expect(marker).toMatchObject({ left: 228, top: 227 })
    expect(minute).toMatchObject({ centerX: 227, pivotOffsetX: 1 })

    mocks.activeObject = minute
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', shiftKey: true, bubbles: true }))
    expect(minute).toMatchObject({ centerY: 237, pivotOffsetY: -10 })
    expect(marker).toMatchObject({ left: 228, top: 227 })
    expect(mocks.saveState).toHaveBeenCalledTimes(2)
  })

  it('restores the entry geometry and exits calibration when Escape is pressed', () => {
    startHandCalibration('minute-1')
    const minute = mocks.canvas.objects[1]
    const moving = mocks.canvas.on.mock.calls.find(([event]: [string]) => event === 'object:moving')?.[1]

    minute.left = 240
    minute.top = 250
    moving({ target: minute })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(handCalibrationState.active).toBe(false)
    expect(minute).toMatchObject({
      centerX: 227,
      centerY: 227,
      left: 227,
      top: 227,
      pivotOffsetX: 0,
      pivotOffsetY: 0,
      angle: 60,
    })
    expect(mocks.patchElement).toHaveBeenLastCalledWith('minute-1', expect.objectContaining({
      centerX: 227,
      centerY: 227,
      left: 227,
      top: 227,
      pivotOffsetX: 0,
      pivotOffsetY: 0,
    }))
  })

  it('calibrates a rotating hand at 12 o clock and restores its preview angle', () => {
    const rotating = hand('rotating-1', 'rotatingHand')
    rotating.startAngle = 150
    rotating.angle = 270
    mocks.canvas.objects.push(rotating)

    expect(startHandCalibration('rotating-1')).toBe(true)
    expect(rotating.angle).toBe(0)

    stopHandCalibration()
    expect(rotating.angle).toBe(270)
  })
})
