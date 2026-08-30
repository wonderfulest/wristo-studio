import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  removeElementFromLayoutGroups: vi.fn(),
  scheduleReflowForElement: vi.fn(),
  moveLayoutGroupByProxyCenter: vi.fn(),
  canvasRemove: vi.fn(),
  requestRenderAll: vi.fn(),
  activeObjects: [] as any[],
  removeElementData: vi.fn(),
  patchElement: vi.fn(),
  removeLayer: vi.fn(),
  saveState: vi.fn(),
}))

vi.mock('@/engine/layout/studioLayoutController', () => ({
  removeElementFromLayoutGroups: mocks.removeElementFromLayoutGroups,
  scheduleReflowForElement: mocks.scheduleReflowForElement,
  moveLayoutGroupByProxyCenter: mocks.moveLayoutGroupByProxyCenter,
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({
    canvas: {
      getObjects: () => [],
      getActiveObjects: () => mocks.activeObjects,
      remove: mocks.canvasRemove,
      requestRenderAll: mocks.requestRenderAll,
    },
  }),
}))

vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({
    removeElement: mocks.removeElementData,
    patchElement: mocks.patchElement,
  }),
}))

vi.mock('@/stores/layerStore', () => ({
  useLayerStore: () => ({ removeLayer: mocks.removeLayer }),
}))

vi.mock('@/stores/historyStore', () => ({
  useHistoryStore: () => ({ saveState: mocks.saveState }),
}))

import { nudgeSelection, registerElementInstance, removeElement } from './elementManager'

describe('elementManager layout group lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.activeObjects = []
  })

  it('keeps group membership when a rendered instance is registered', () => {
    registerElementInstance({ id: 'value' } as any)

    expect(mocks.removeElementFromLayoutGroups).not.toHaveBeenCalled()
  })

  it('removes membership only when the business element is deleted', () => {
    removeElement({ id: 'value' } as any)

    expect(mocks.removeElementFromLayoutGroups).toHaveBeenCalledOnce()
    expect(mocks.removeElementFromLayoutGroups).toHaveBeenCalledWith('value')
  })

  it('nudges a layout group through its proxy center instead of persisting the proxy as an element', () => {
    const proxy = {
      id: 'layout-group:row-1',
      eleType: 'layoutGroupProxy',
      layoutGroupId: 'row-1',
      left: 40,
      top: 30,
      set(patch: Record<string, number>) {
        Object.assign(this, patch)
      },
      setCoords: vi.fn(),
      getCenterPoint() {
        return { x: this.left, y: this.top }
      },
    }
    mocks.activeObjects = [proxy]

    nudgeSelection('right', 2)

    expect(mocks.moveLayoutGroupByProxyCenter).toHaveBeenCalledWith('row-1', 42, 30)
    expect(mocks.patchElement).not.toHaveBeenCalledWith(
      'layout-group:row-1',
      expect.anything(),
    )
  })
})
