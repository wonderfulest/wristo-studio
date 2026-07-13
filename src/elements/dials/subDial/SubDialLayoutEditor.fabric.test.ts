import { Group, StaticCanvas, Text } from 'fabric/node'
import { describe, expect, it, vi } from 'vitest'
import { SubDialLayoutEditor } from './SubDialLayoutEditor'

const keys = ['icon', 'label', 'value', 'unit', 'goalValue', 'percentage'] as const

function realFabricFixture() {
  const canvas = new StaticCanvas(undefined, { width: 600, height: 600 })
  const children = Object.fromEntries(
    keys.map((key, index) => [
      key,
      new Text(key, {
        left: index === 2 ? 20 : 0,
        top: index === 2 ? 10 : index * 8,
        originX: 'center',
        originY: 'center',
        subDialContentKey: key,
        selectable: false,
        evented: false
      } as any)
    ])
  ) as any
  const group = new Group(Object.values(children), {
    left: 300,
    top: 300,
    originX: 'center',
    originY: 'center',
    angle: 30,
    scaleX: 2,
    scaleY: 2
  }) as any
  group.eleType = 'subDial'
  const item = (x: number, y: number) => ({ visible: true, x, y, rotation: 0, scale: 1 })
  group.__element = {
    config: { radius: 100, content: Object.fromEntries(keys.map((key) => [key, item(key === 'value' ? 0.2 : 0, key === 'value' ? 0.1 : 0)])) },
    children: { content: children }
  }
  canvas.add(group)
  group.setCoords()
  const updateElement = vi.fn(async (_group, patch) => {
    group.__element.config.content = patch.content
  })
  const saveHistory = vi.fn()
  const editor = new SubDialLayoutEditor({ canvas: canvas as any, updateElement, saveHistory, document: null })
  return { canvas, group, children, updateElement, saveHistory, editor }
}

describe('SubDialLayoutEditor real Fabric integration', () => {
  it('keeps the overlay out of serialization and tracks real rotated/scaled child bounds', () => {
    const { canvas, group, children, editor } = realFabricFixture()
    editor.enter(group)
    editor.select('value')
    expect(canvas.getObjects()).toHaveLength(2)
    expect(canvas.toObject().objects).toHaveLength(1)
    const bounds = children.value.getBoundingRect()
    const overlay = canvas.getObjects()[1] as any
    expect(overlay.excludeFromExport).toBe(true)
    expect(overlay).toMatchObject({
      left: bounds.left + bounds.width / 2,
      top: bounds.top + bounds.height / 2,
      width: bounds.width,
      height: bounds.height,
      evented: false,
      selectable: false
    })
    editor.dispose()
    canvas.dispose()
  })

  it('hits a real content child under rotation/scale and exits when its group is removed', async () => {
    const { canvas, group, children, updateElement, editor } = realFabricFixture()
    const center = group.getCenterPoint()
    ;(canvas as any).getScenePoint = (event: any) => ({ x: event.x, y: event.y })
    editor.enter(group)
    canvas.fire('mouse:down' as any, { target: group, subTargets: [children.value], e: { x: center.x, y: center.y } } as any)
    canvas.fire('mouse:move' as any, { e: { x: center.x + 40, y: center.y + 20 } } as any)
    canvas.fire('mouse:up' as any, {} as any)
    await Promise.resolve()
    await Promise.resolve()
    expect(updateElement).toHaveBeenCalledTimes(1)
    canvas.remove(group)
    expect(editor.isEditing()).toBe(false)
    editor.dispose()
    canvas.dispose()
  })
})
