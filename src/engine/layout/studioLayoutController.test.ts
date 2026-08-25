// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useLayoutGroupStore } from '@/stores/layoutGroupStore'
import {
  createLayoutGroupFromSelection,
  dissolveLayoutGroup,
  getLayoutGroupProjection,
  moveLayoutGroup,
  moveLayoutGroupByProxyCenter,
  reflowLayoutGroup,
} from './studioLayoutController'

const makeElement = (id: string, eleType: string, text: string | undefined, left: number, width: number) => {
  const element: any = {
    id, eleType, text, left, top: 30, topBase: 36, width, height: 20, visible: true,
    set(patch: string | Record<string, unknown>, value?: unknown) {
      if (typeof patch === 'string') this[patch] = value
      else Object.assign(this, patch)
    },
    setCoords() {},
    getBoundingRect() {
      return { left: this.left - this.width / 2, top: this.top - this.height / 2, width: this.width, height: this.height }
    },
  }
  return element
}

describe('studioLayoutController', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const setup = () => {
    const data = makeElement('data-1', 'data', '100', 30, 30)
    const unit = makeElement('unit-1', 'unit', '%', 50, 10)
    const canvas = { getObjects: () => [data, unit], requestRenderAll: () => undefined }
    useCanvasStore().canvas = canvas as any
    useElementDataStore().upsertElement({ id: 'data-1', eleType: 'data', left: 30, top: 30, topBase: 36 } as any)
    useElementDataStore().upsertElement({ id: 'unit-1', eleType: 'unit', left: 50, top: 30, topBase: 36 } as any)
    useLayoutGroupStore().createGroup({
      id: 'row-1', name: 'Row', direction: 'horizontal', left: 100, top: 40, originX: 'right',
      members: [
        { elementId: 'data-1', gapBefore: 0, offsetY: 0 },
        { elementId: 'unit-1', gapBefore: 2, offsetY: 3 },
      ],
    })
    return { data, unit }
  }

  it('reflows members and writes compatible absolute positions', () => {
    const { data, unit } = setup()
    const result = reflowLayoutGroup('row-1')

    expect(result).toMatchObject({ left: 58, right: 100, width: 42 })
    expect(data.left).toBe(73)
    expect(unit.left).toBe(95)
    expect(unit.top).toBe(43)
    expect(useElementDataStore().getElementConfig('unit-1')).toMatchObject({ left: 95, top: 43, topBase: 49 })
  })

  it('keeps the anchor fixed after content width changes', () => {
    const { data } = setup()
    reflowLayoutGroup('row-1')
    data.width = 50
    const result = reflowLayoutGroup('row-1')

    expect(result).toMatchObject({ right: 100, width: 62 })
    expect(useLayoutGroupStore().groups[0].left).toBe(100)
  })

  it('creates a center-anchored group in visual left-to-right order', () => {
    const { data, unit } = setup()
    useLayoutGroupStore().clear()
    data.left = 80
    unit.left = 20

    const id = createLayoutGroupFromSelection(['data-1', 'unit-1'], { id: 'created-row' })

    expect(id).toBe('created-row')
    expect(useLayoutGroupStore().groups[0]).toMatchObject({ originX: 'center', left: 55, top: 30 })
    expect(useLayoutGroupStore().groups[0].members.map((member) => member.elementId)).toEqual(['unit-1', 'data-1'])
  })

  it('moves a group anchor and dissolves without moving its members', () => {
    const { data, unit } = setup()
    reflowLayoutGroup('row-1')
    moveLayoutGroup('row-1', 120, 50)
    const before = [data.left, data.top, unit.left, unit.top]

    dissolveLayoutGroup('row-1')

    expect(useLayoutGroupStore().groups).toEqual([])
    expect([data.left, data.top, unit.left, unit.top]).toEqual(before)
    expect(getLayoutGroupProjection('row-1')).toBeNull()
  })

  it('moves from the proxy center by delta without replacing the layout anchor', () => {
    const { data, unit } = setup()
    const before = reflowLayoutGroup('row-1')!
    const beforeCenter = {
      x: before.left + before.width / 2,
      y: before.top + before.height / 2,
    }

    const moved = moveLayoutGroupByProxyCenter(
      'row-1',
      beforeCenter.x + 10,
      beforeCenter.y + 15,
    )!

    expect(useLayoutGroupStore().groups[0]).toMatchObject({ left: 110, top: 55, originX: 'right' })
    expect(moved.left + moved.width / 2).toBe(beforeCenter.x + 10)
    expect(moved.top + moved.height / 2).toBe(beforeCenter.y + 15)
    expect(data.left).toBe(83)
    expect(data.top).toBe(55)
    expect(unit.left).toBe(105)
    expect(unit.top).toBe(58)
  })
})
