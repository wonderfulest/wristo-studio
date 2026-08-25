import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  removeElementFromLayoutGroups: vi.fn(),
  scheduleReflowForElement: vi.fn(),
  canvasRemove: vi.fn(),
  removeElementData: vi.fn(),
  removeLayer: vi.fn(),
  saveState: vi.fn(),
}))

vi.mock('@/engine/layout/studioLayoutController', () => ({
  removeElementFromLayoutGroups: mocks.removeElementFromLayoutGroups,
  scheduleReflowForElement: mocks.scheduleReflowForElement,
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({
    canvas: {
      getObjects: () => [],
      remove: mocks.canvasRemove,
    },
  }),
}))

vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({ removeElement: mocks.removeElementData }),
}))

vi.mock('@/stores/layerStore', () => ({
  useLayerStore: () => ({ removeLayer: mocks.removeLayer }),
}))

vi.mock('@/stores/historyStore', () => ({
  useHistoryStore: () => ({ saveState: mocks.saveState }),
}))

import { registerElementInstance, removeElement } from './elementManager'

describe('elementManager layout group lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
