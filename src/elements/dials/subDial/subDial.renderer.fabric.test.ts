import { Circle, Group, Text } from 'fabric/node'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => ({ canvas: undefined }) }))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ addLayer: vi.fn() }) }))
vi.mock('@/stores/elementDataStore', () => ({ useElementDataStore: () => ({ upsertElement: vi.fn() }) }))
vi.mock('@/utils/controlManager', () => ({ applyControlsToObject: vi.fn() }))
import { atomicReplaceGroupObjects } from './fabricGroupAtomicReplace'

function circle(radius: number) {
  return new Circle({ radius, left: 0, top: 0, originX: 'center', originY: 'center' })
}

describe('subDial real Fabric group replacement', () => {
  it('performs one controlled layout while preserving content identities and stack order', () => {
    const background = circle(48)
    const oldMajor = new Group([circle(42)])
    const oldMinor = new Group([circle(40)])
    const oldLabels = new Group([new Text('0', { left: -30, top: 16 })])
    const oldPointer = new Group([circle(4)])
    const oldCap = circle(4)
    const content = ['icon', 'label', 'value', 'unit', 'goalValue', 'percentage'].map((text, index) => new Text(text, { left: 0, top: -20 + index * 8, originX: 'center', originY: 'center' }))
    const group = new Group([background, oldMajor, oldMinor, oldLabels, oldPointer, oldCap, ...content], {
      left: 137,
      top: 219,
      angle: 23,
      originX: 'center',
      originY: 'center'
    })
    const canvas = { fire: vi.fn(), getActiveObject: vi.fn() }
    group.set('canvas', canvas as any)
    const performLayout = vi.spyOn(group.layoutManager, 'performLayout')

    const next = [circle(72), new Group([circle(64)]), new Group([circle(62)]), new Group([new Text('50', { left: 0, top: -48 })]), new Group([circle(6)]), circle(0), ...content]
    atomicReplaceGroupObjects(group, next)

    expect(performLayout).toHaveBeenCalledTimes(1)
    expect(group).toMatchObject({ left: 137, top: 219, angle: 23 })
    expect(group.width).toBeGreaterThanOrEqual(144)
    expect(group.width).toBeLessThan(148)
    expect(group.height).toBeGreaterThanOrEqual(144)
    expect(group.height).toBeLessThan(148)
    expect(group.getObjects()).toEqual(next)
    expect(group.getObjects().slice(-6)).toEqual(content)
    ;[background, oldMajor, oldMinor, oldLabels, oldPointer, oldCap].forEach((child) => {
      expect(child.group).toBeUndefined()
      expect(child.parent).toBeUndefined()
      expect(child.canvas).toBeUndefined()
    })
    next.forEach((child) => {
      expect(child.group).toBe(group)
      expect(child.parent).toBe(group)
      expect(child.canvas).toBe(canvas)
    })
    expect(next[0].getRelativeCenterPoint()).toMatchObject({ x: 0, y: 0 })
    next.forEach((child) => {
      const center = child.getRelativeCenterPoint()
      expect(Math.hypot(center.x, center.y)).toBeLessThanOrEqual(72)
    })

    const bounds = { left: group.left, top: group.top, width: group.width, height: group.height }
    for (let index = 0; index < 4; index += 1) {
      const replacement = [
        circle(72),
        new Group([circle(60 + index)]),
        new Group([circle(58)]),
        new Group([new Text(String(index), { left: 0, top: -48 })]),
        new Group([circle(5)]),
        circle(0),
        ...content
      ]
      atomicReplaceGroupObjects(group, replacement)
      const callsAfterReplace = performLayout.mock.calls.length
      const addedMajor = replacement[1] as Group
      oldMajor.fire('modified')
      expect(performLayout).toHaveBeenCalledTimes(callsAfterReplace)
      addedMajor.fire('modified')
      expect(performLayout).toHaveBeenCalledTimes(callsAfterReplace + 1)
      addedMajor.fire('modified')
      expect(performLayout).toHaveBeenCalledTimes(callsAfterReplace + 2)
      expect(group.left).toBeCloseTo(bounds.left)
      expect(group.top).toBeCloseTo(bounds.top)
      expect(group.width).toBeCloseTo(bounds.width)
      expect(group.height).toBeCloseTo(bounds.height)
      expect(group.getObjects()).toEqual(replacement)
      expect(group.getObjects().slice(-6)).toEqual(content)
      expect(replacement[0].getRelativeCenterPoint()).toMatchObject({ x: 0, y: 0 })
    }
  })
})
