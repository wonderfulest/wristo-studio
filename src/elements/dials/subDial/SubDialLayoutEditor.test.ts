import { describe, expect, it, vi } from 'vitest'
import { SubDialLayoutEditor } from './SubDialLayoutEditor'

const keys = ['icon', 'label', 'value', 'unit', 'goalValue', 'percentage'] as const

function fixture(hidden: (typeof keys)[number] | null = null) {
  const listeners = new Map<string, Set<(event: any) => void>>()
  const canvas = {
    on: vi.fn((name: string, handler: (event: any) => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set())
      listeners.get(name)!.add(handler)
    }),
    off: vi.fn((name: string, handler: (event: any) => void) => listeners.get(name)?.delete(handler)),
    fire: (name: string, event: any = {}) => listeners.get(name)?.forEach((handler) => handler(event)),
    getScenePoint: (event: any) => ({ x: event.x, y: event.y }),
    discardActiveObject: vi.fn(),
    requestRenderAll: vi.fn()
  }
  const children = Object.fromEntries(
    keys.map((key) => [
      key,
      {
        subDialContentKey: key,
        visible: hidden !== key,
        left: key === 'value' ? 20 : 0,
        top: key === 'value' ? 10 : 0,
        width: 10,
        height: 10,
        scaleX: 1,
        scaleY: 1,
        evented: false,
        selectable: false,
        set(values: any) {
          Object.assign(this, values)
        },
        getScaledWidth() {
          return this.width * this.scaleX
        },
        getScaledHeight() {
          return this.height * this.scaleY
        }
      }
    ])
  ) as any
  const content = Object.fromEntries(
    keys.map((key) => [
      key,
      {
        visible: hidden !== key,
        x: key === 'value' ? 0.2 : 0,
        y: key === 'value' ? 0.1 : 0,
        rotation: 0,
        scale: 1,
        color: '#fff',
        font: '',
        fontSize: 12,
        textAlign: 'center',
        prefix: '',
        suffix: '',
        decimals: 0
      }
    ])
  ) as any
  content.icon = { ...content.icon, displayType: 'auto', size: 12 }
  const group: any = {
    eleType: 'subDial',
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
    lockMovementX: false,
    lockMovementY: false,
    lockScalingX: false,
    lockScalingY: false,
    lockRotation: false,
    subTargetCheck: false,
    scaleX: 2,
    scaleY: 2,
    angle: 90,
    __element: { config: { radius: 100, content }, children: { content: children } },
    set(values: any) {
      Object.assign(this, values)
    },
    setCoords: vi.fn(),
    getCenterPoint: () => ({ x: 300, y: 200 })
  }
  const updateElement = vi.fn(async (_group, patch) => {
    group.__element.config.content = patch.content
  })
  const saveHistory = vi.fn()
  const editor = new SubDialLayoutEditor({ canvas: canvas as any, updateElement, saveHistory, document: null })
  return { canvas, group, children, updateElement, saveHistory, editor }
}

describe('SubDialLayoutEditor', () => {
  it('enters, selects a visible child and restores all interaction state on exit', () => {
    const { editor, group, children, canvas } = fixture()
    editor.enter(group)
    expect(group).toMatchObject({
      selectable: false,
      evented: true,
      hasControls: false,
      hasBorders: false,
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      subTargetCheck: true
    })
    expect(children.value).toMatchObject({ evented: true, selectable: false })
    expect(editor.select('value')).toBe(true)
    editor.exit()
    expect(group).toMatchObject({
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      lockMovementX: false,
      lockMovementY: false,
      lockScalingX: false,
      lockScalingY: false,
      lockRotation: false,
      subTargetCheck: false
    })
    expect(children.value.evented).toBe(false)
    expect(canvas.discardActiveObject).toHaveBeenCalled()
  })

  it('does not immediately exit when clearing the outer Fabric selection', () => {
    const { editor, group, canvas } = fixture()
    canvas.discardActiveObject.mockImplementation(() => canvas.fire('selection:cleared'))
    expect(editor.enter(group)).toBe(true)
    expect(editor.isEditing(group)).toBe(true)
    editor.exit()
  })

  it('previews many moves but commits one complete content patch and one history state', async () => {
    const { editor, group, children, updateElement, saveHistory } = fixture()
    editor.enter(group)
    editor.select('value')
    editor.beginDrag({ x: 300, y: 240 })
    editor.updateDrag({ x: 260, y: 280 }, { shiftKey: false })
    editor.updateDrag({ x: 240, y: 300 }, { shiftKey: false })
    expect(children.value.left).not.toBe(20)
    expect(updateElement).not.toHaveBeenCalled()
    await editor.endDrag()
    expect(updateElement).toHaveBeenCalledTimes(1)
    expect(updateElement.mock.calls[0][1].content).toEqual(expect.objectContaining(Object.fromEntries(keys.map((key) => [key, expect.any(Object)]))))
    expect(saveHistory).toHaveBeenCalledTimes(1)
  })

  it('locks shift dragging in canvas space and constrains content within the circular edge', () => {
    const { editor, group } = fixture()
    editor.enter(group)
    editor.select('value')
    editor.beginDrag({ x: 300, y: 240 })
    editor.updateDrag({ x: 360, y: 260 }, { shiftKey: true })
    const value = group.__element.config.content.value
    expect(value.x).toBeCloseTo(0.2)
    editor.updateDrag({ x: 800, y: 260 }, { shiftKey: true })
    expect(Math.hypot(value.x, value.y)).toBeLessThan(1)
  })

  it('exits on Escape or an outside selection', () => {
    const { editor, group, canvas } = fixture()
    editor.enter(group)
    expect(editor.handleKeyDown({ key: 'Escape', preventDefault: vi.fn() } as any)).toBe(true)
    expect(editor.isEditing()).toBe(false)
    editor.enter(group)
    canvas.fire('selection:created', { selected: [{ eleType: 'text' }] })
    expect(editor.isEditing()).toBe(false)
  })

  it('does not hit hidden content but still permits panel selection', () => {
    const { editor, group, children, canvas } = fixture('unit')
    editor.enter(group)
    canvas.fire('mouse:down', { subTargets: [children.unit], e: { x: 300, y: 200 } })
    expect(editor.beginDrag({ x: 300, y: 200 })).toBe(false)
    expect(editor.select('unit')).toBe(true)
  })

  it('centers and resets the selected position with one commit each', async () => {
    const { editor, group, updateElement, saveHistory } = fixture()
    editor.enter(group)
    editor.select('value')
    await editor.center('x')
    expect(group.__element.config.content.value).toMatchObject({ x: 0, y: 0.1 })
    await editor.resetSelectedPosition()
    expect(group.__element.config.content.value).toMatchObject({ x: 0, y: 0 })
    expect(updateElement).toHaveBeenCalledTimes(2)
    expect(saveHistory).toHaveBeenCalledTimes(2)
  })

  it('disposes every listener and ignores later callbacks', () => {
    const { editor, group, canvas } = fixture()
    editor.dispose()
    canvas.fire('mouse:dblclick', { target: group })
    expect(editor.isEditing()).toBe(false)
    expect(canvas.off).toHaveBeenCalled()
  })
})
