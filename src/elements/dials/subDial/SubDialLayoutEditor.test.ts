import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { SubDialLayoutEditor } from './SubDialLayoutEditor'

const keys = ['icon', 'label', 'value', 'unit', 'goalValue', 'percentage'] as const

function fixture(hidden: (typeof keys)[number] | null = null) {
  const objects: any[] = []
  const listeners = new Map<string, Set<(event: any) => void>>()
  const canvas = {
    on: vi.fn((name: string, handler: (event: any) => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set())
      listeners.get(name)!.add(handler)
    }),
    off: vi.fn((name: string, handler: (event: any) => void) => listeners.get(name)?.delete(handler)),
    fire: (name: string, event: any = {}) => listeners.get(name)?.forEach((handler) => handler(event)),
    getScenePoint: (event: any) => ({ x: event.x, y: event.y }),
    add: vi.fn(),
    remove: vi.fn(),
    getObjects: () => objects,
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
        },
        getBoundingRect() {
          return { left: this.left + 280, top: this.top + 180, width: this.width, height: this.height }
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
  const runWithoutRecording = vi.fn((task: () => void) => task())
  const onError = vi.fn()
  objects.push(group)
  const editor = new SubDialLayoutEditor({ canvas: canvas as any, updateElement, saveHistory, runWithoutRecording, onError, document: null })
  return { canvas, group, children, objects, updateElement, saveHistory, runWithoutRecording, onError, editor }
}

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('SubDialLayoutEditor', () => {
  it('isolates selection listener errors and removes an unsubscribed callback', () => {
    const { editor, group } = fixture()
    const listener = vi.fn()
    editor.subscribeSelection(() => { throw new Error('listener') })
    const stop = editor.subscribeSelection(listener)
    editor.enter(group)
    expect(() => editor.select('value')).not.toThrow()
    stop()
    editor.select('unit')
    expect(listener).toHaveBeenCalledTimes(2)
  })
  it('wires the exact content drag history reason in Canvas', () => {
    const canvasSource = readFileSync(new URL('../../../views/Canvas.vue', import.meta.url), 'utf8')
    expect(canvasSource).toContain("historyStore.saveState('sub-dial:content-drag')")
    expect(canvasSource).toContain('updateElement: (element, patch) => updateSubDial(element, patch)')
  })

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
    const configBefore = structuredClone(group.__element.config.content)
    editor.updateDrag({ x: 260, y: 280 }, { shiftKey: false })
    editor.updateDrag({ x: 240, y: 300 }, { shiftKey: false })
    expect(children.value.top).not.toBe(10)
    expect(group.__element.config.content).toEqual(configBefore)
    expect(updateElement).not.toHaveBeenCalled()
    await editor.endDrag()
    expect(updateElement).toHaveBeenCalledTimes(1)
    expect(updateElement.mock.calls[0][1].content).toEqual(expect.objectContaining(Object.fromEntries(keys.map((key) => [key, expect.any(Object)]))))
    expect(saveHistory).toHaveBeenCalledTimes(1)
  })

  it('locks shift dragging in canvas space and constrains content within the circular edge', () => {
    const { editor, group, children } = fixture()
    editor.enter(group)
    editor.select('value')
    editor.beginDrag({ x: 300, y: 240 })
    editor.updateDrag({ x: 360, y: 260 }, { shiftKey: true })
    expect(children.value.left).toBeCloseTo(20)
    editor.updateDrag({ x: 800, y: 260 }, { shiftKey: true })
    expect(Math.hypot(children.value.left / 100, children.value.top / 100)).toBeLessThan(1)
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

  it('exits when double-clicking anything except the current sub-dial', () => {
    const { editor, group, canvas } = fixture()
    editor.enter(group)
    canvas.fire('mouse:dblclick', { target: { eleType: 'text' } })
    expect(editor.isEditing()).toBe(false)
    editor.enter(group)
    canvas.fire('mouse:dblclick', {})
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
    await editor.center('horizontal')
    expect(group.__element.config.content.value).toMatchObject({ x: 0, y: 0.1 })
    await editor.resetSelectedPosition()
    expect(group.__element.config.content.value).toMatchObject({ x: 0, y: 0 })
    expect(updateElement).toHaveBeenCalledTimes(2)
    expect(saveHistory).toHaveBeenCalledTimes(2)
  })

  it('adds, updates and removes a non-evented canvas selection overlay', () => {
    const { editor, group, children, canvas, runWithoutRecording } = fixture()
    editor.enter(group)
    editor.select('value')
    expect(canvas.add).toHaveBeenCalledTimes(1)
    expect(runWithoutRecording).toHaveBeenCalled()
    const overlay = canvas.add.mock.calls[0][0]
    expect(overlay).toMatchObject({ evented: false, selectable: false, left: 305, top: 195, width: 10, height: 10 })
    children.value.left = 40
    editor.select('value')
    expect(overlay.left).toBe(325)
    editor.exit()
    expect(canvas.remove).toHaveBeenCalledWith(overlay)
  })

  it('does not show an overlay for hidden panel selection', () => {
    const { editor, group, canvas } = fixture('unit')
    editor.enter(group)
    editor.select('unit')
    expect(canvas.add).not.toHaveBeenCalled()
  })

  it('restores a pending preview on Escape without changing config', () => {
    const { editor, group, children } = fixture()
    editor.enter(group)
    editor.select('value')
    editor.beginDrag({ x: 300, y: 240 })
    editor.updateDrag({ x: 400, y: 240 }, { shiftKey: false })
    expect(children.value.top).not.toBe(10)
    editor.handleKeyDown({ key: 'Escape', preventDefault: vi.fn() } as any)
    expect(children.value).toMatchObject({ left: 20, top: 10 })
    expect(group.__element.config.content.value).toMatchObject({ x: 0.2, y: 0.1 })
  })

  it('restores child interaction properties exactly, including undefined', () => {
    const { editor, group, children } = fixture()
    children.value.evented = undefined
    children.value.selectable = true
    editor.enter(group)
    editor.exit()
    expect(children.value.evented).toBeUndefined()
    expect(children.value.selectable).toBe(true)
  })

  it('restores changed outer properties exactly, including undefined', () => {
    const { editor, group } = fixture()
    group.evented = undefined
    group.hasBorders = undefined
    editor.enter(group)
    editor.exit()
    expect(group.evented).toBeUndefined()
    expect(group.hasBorders).toBeUndefined()
  })

  it.each([
    [Number.NaN, 1],
    [0, 0],
    [-1, -1],
    [1, 1.1]
  ])('rejects invalid or non-uniform group scale %s/%s', (scaleX, scaleY) => {
    const { editor, group } = fixture()
    group.scaleX = scaleX
    group.scaleY = scaleY
    expect(editor.enter(group)).toBe(false)
    expect(editor.isEditing()).toBe(false)
  })

  it.each([
    [0, 0.5],
    [30, 0.5],
    [90, 0.5],
    [0, 2],
    [30, 2],
    [90, 2]
  ])('maps drag coordinates at rotation %s and scale %s', async (angle, scale) => {
    const { editor, group, updateElement } = fixture()
    group.angle = angle
    group.scaleX = scale
    group.scaleY = scale
    editor.enter(group)
    editor.select('value')
    const radians = (angle * Math.PI) / 180
    const start = { x: 300, y: 200 }
    const delta = { x: 10 * scale * Math.cos(radians), y: 10 * scale * Math.sin(radians) }
    editor.beginDrag(start)
    editor.updateDrag({ x: start.x + delta.x, y: start.y + delta.y }, { shiftKey: false })
    await editor.endDrag()
    expect(updateElement.mock.calls[0][1].content.value.x).toBeCloseTo(0.3)
    expect(updateElement.mock.calls[0][1].content.value.y).toBeCloseTo(0.1)
  })

  it.each([
    [0, 0.5],
    [30, 0.5],
    [90, 0.5],
    [0, 2],
    [30, 2],
    [90, 2]
  ])('constrains the circular edge at rotation %s and scale %s', async (angle, scale) => {
    const { editor, group, updateElement } = fixture()
    group.angle = angle
    group.scaleX = scale
    group.scaleY = scale
    editor.enter(group)
    editor.select('value')
    editor.beginDrag({ x: 300, y: 200 })
    editor.updateDrag({ x: 3000, y: 3000 }, { shiftKey: false })
    await editor.endDrag()
    const value = updateElement.mock.calls[0][1].content.value
    expect(Math.hypot(value.x, value.y)).toBeLessThan(1)
  })

  it('refuses dragging if an entered group becomes non-uniformly scaled', () => {
    const { editor, group } = fixture()
    editor.enter(group)
    editor.select('value')
    group.scaleY = 3
    expect(editor.beginDrag({ x: 300, y: 200 })).toBe(false)
  })

  it('disposes every listener and ignores later callbacks', () => {
    const { editor, group, canvas } = fixture()
    editor.dispose()
    canvas.fire('mouse:dblclick', { target: group })
    expect(editor.isEditing()).toBe(false)
    expect(canvas.off).toHaveBeenCalled()
  })

  it('serializes rapid commits and merges each operation onto the latest config', async () => {
    const { editor, group, updateElement, saveHistory } = fixture()
    const first = deferred<void>()
    updateElement.mockImplementationOnce(async (_group, patch) => {
      await first.promise
      group.__element.config.content = patch.content
    })
    editor.enter(group)
    editor.select('value')
    const horizontal = editor.center('horizontal')
    const vertical = editor.center('vertical')
    await Promise.resolve()
    expect(updateElement).toHaveBeenCalledTimes(1)
    first.resolve()
    await horizontal
    await vertical
    expect(updateElement).toHaveBeenCalledTimes(2)
    expect(updateElement.mock.calls[1][1].content.value).toMatchObject({ x: 0, y: 0 })
    expect(saveHistory).toHaveBeenCalledTimes(2)
  })

  it('reports update failures, restores preview and does not save history', async () => {
    const { editor, group, children, updateElement, saveHistory, onError } = fixture()
    updateElement.mockRejectedValueOnce(new Error('update failed'))
    editor.enter(group)
    editor.select('value')
    editor.beginDrag({ x: 300, y: 200 })
    editor.updateDrag({ x: 400, y: 200 }, { shiftKey: false })
    expect(await editor.endDrag()).toBe(false)
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'update failed' }))
    expect(saveHistory).not.toHaveBeenCalled()
    expect(children.value).toMatchObject({ left: 20, top: 10 })
  })

  it.each(['exit', 'dispose'] as const)('finishes the original update and saves history once when %s occurs during it', async (action) => {
    const { editor, group, updateElement, saveHistory } = fixture()
    const pending = deferred<void>()
    updateElement.mockImplementationOnce(async (_group, patch) => {
      await pending.promise
      group.__element.config.content = patch.content
    })
    editor.enter(group)
    editor.select('value')
    const commit = editor.center('horizontal')
    await Promise.resolve()
    editor[action]()
    pending.resolve()
    expect(await commit).toBe(true)
    expect(group.__element.config.content.value.x).toBe(0)
    expect(saveHistory).toHaveBeenCalledTimes(1)
  })

  it('does not route or save a pending old-group patch after restore replaces that instance', async () => {
    const { editor, group, canvas, objects, updateElement, saveHistory } = fixture()
    group.id = 'same-id'
    const pending = deferred<void>()
    updateElement.mockImplementationOnce(async (capturedGroup, patch) => {
      await pending.promise
      capturedGroup.__element.config.content = patch.content
    })
    editor.enter(group)
    editor.select('value')
    const commit = editor.center('horizontal')
    await Promise.resolve()
    const replacement = {
      ...group,
      __element: {
        ...group.__element,
        config: { ...group.__element.config, content: structuredClone(group.__element.config.content) }
      }
    }
    replacement.__element.config.content.value.x = 0.75
    objects.splice(0, 1, replacement)
    canvas.fire('object:removed', { target: group })
    canvas.fire('object:added', { target: replacement })
    pending.resolve()
    expect(await commit).toBe(false)
    expect(replacement.__element.config.content.value.x).toBe(0.75)
    expect(saveHistory).not.toHaveBeenCalled()
  })

  it('exits when the edited group is removed or replaced during history restore', () => {
    const { editor, group, canvas, objects } = fixture()
    editor.enter(group)
    objects.splice(0)
    canvas.fire('object:removed', { target: group })
    expect(editor.isEditing()).toBe(false)
    objects.push(group)
    editor.enter(group)
    objects.splice(0, 1, { ...group })
    canvas.fire('object:added', { target: objects[0] })
    expect(editor.isEditing()).toBe(false)
  })

  it('refuses to commit a stale group that is no longer attached', async () => {
    const { editor, group, objects, updateElement, saveHistory } = fixture()
    editor.enter(group)
    editor.select('value')
    objects.splice(0)
    expect(await editor.center('horizontal')).toBe(false)
    expect(updateElement).not.toHaveBeenCalled()
    expect(saveHistory).not.toHaveBeenCalled()
    expect(editor.isEditing()).toBe(false)
  })
})
