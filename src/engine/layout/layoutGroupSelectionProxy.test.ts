// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('fabric', () => ({
  Rect: class {
    type = 'rect'
    constructor(options: Record<string, unknown>) { Object.assign(this, options) }
    set(patch: Record<string, unknown>) { Object.assign(this, patch) }
    setCoords() {}
  },
}))

import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useLayoutGroupStore } from '@/stores/layoutGroupStore'
import {
  disposeLayoutGroupProxy,
  selectLayoutGroupProxy,
  syncLayoutGroupProxyBounds,
} from './layoutGroupSelectionProxy'

describe('layoutGroupSelectionProxy', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creates one non-exported proxy from the current projected bounds', () => {
    const data: any = {
      id: 'data-1', eleType: 'data', text: '100', left: 30, top: 20, width: 30, height: 20, visible: true,
      set(patch: Record<string, unknown>) { Object.assign(this, patch) }, setCoords() {},
      getBoundingRect() { return { left: this.left - 15, top: this.top - 10, width: 30, height: 20 } },
    }
    const unit: any = {
      id: 'unit-1', eleType: 'unit', text: '%', left: 50, top: 20, width: 10, height: 10, visible: true,
      set(patch: Record<string, unknown>) { Object.assign(this, patch) }, setCoords() {},
      getBoundingRect() { return { left: this.left - 5, top: this.top - 5, width: 10, height: 10 } },
    }
    const calls: string[] = []
    const add = vi.fn(() => calls.push('add'))
    const discardActiveObject = vi.fn(() => calls.push('discard'))
    const setActiveObject = vi.fn(() => calls.push('activate-proxy'))
    useCanvasStore().canvas = {
      getObjects: () => [data, unit], add, discardActiveObject, setActiveObject, requestRenderAll: vi.fn(), remove: vi.fn(),
    } as any
    useElementDataStore().upsertElement({ id: 'data-1', eleType: 'data', left: 30, top: 20 } as any)
    useElementDataStore().upsertElement({ id: 'unit-1', eleType: 'unit', left: 50, top: 20 } as any)
    useLayoutGroupStore().createGroup({
      id: 'row-1', name: 'Row', direction: 'horizontal', left: 100, top: 40, originX: 'right',
      members: [
        { elementId: 'data-1', gapBefore: 0, offsetY: 0 },
        { elementId: 'unit-1', gapBefore: 2, offsetY: 0 },
      ],
    })

    const proxy: any = selectLayoutGroupProxy('row-1')

    expect(proxy).toMatchObject({
      id: 'layout-group:row-1', eleType: 'layoutGroupProxy', layoutGroupId: 'row-1',
      excludeFromExport: true, originX: 'center', originY: 'center', left: 79, top: 40, width: 42,
    })
    expect(add).toHaveBeenCalledWith(proxy)
    expect(setActiveObject).toHaveBeenCalledWith(proxy)
    expect(calls).toEqual(['discard', 'add', 'activate-proxy'])
    expect(useCanvasStore().activeLayoutGroupIds).toEqual(['row-1'])

    useLayoutGroupStore().updateGroup('row-1', { left: 120 })
    syncLayoutGroupProxyBounds('row-1')
    expect(proxy.left).toBe(99)

    disposeLayoutGroupProxy('row-1')
    expect(useCanvasStore().activeLayoutGroupIds).toEqual([])
  })
})
