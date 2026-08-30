import { beforeEach, describe, expect, it, vi } from 'vitest'

const { configs, elements, groups, requestRenderAll, reflow, syncBounds, updateElementById } = vi.hoisted(() => ({
  configs: new Map<string, any>(),
  elements: [] as any[],
  groups: [] as any[],
  requestRenderAll: vi.fn(),
  reflow: vi.fn(),
  syncBounds: vi.fn(),
  updateElementById: vi.fn(),
}))

vi.mock('@/stores/layoutGroupStore', () => ({ useLayoutGroupStore: () => ({ groups }) }))
vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({ elements }),
}))
vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas: { requestRenderAll } }),
}))
vi.mock('@/engine/managers/elementManager', () => ({ updateElementById }))
vi.mock('@/engine/layout/studioLayoutController', () => ({ reflowLayoutGroup: reflow }))
vi.mock('@/engine/layout/layoutGroupSelectionProxy', () => ({ syncLayoutGroupProxyBounds: syncBounds }))
vi.mock('@/elements/common/settings/propertyBinding', () => ({
  resolveMetricPropertyBindingPatch: (element: any, propertyKey: string, type: string) => ({
    [type === 'goal' ? 'goalProperty' : 'dataProperty']: propertyKey,
    text: element.eleType === 'unit' ? 'km' : '8.5 km',
  }),
}))

import { syncMetricPropertyBindings } from './layoutGroupPropertySync'

describe('layout-group metric property sync', () => {
  beforeEach(() => {
    configs.clear()
    elements.splice(0)
    groups.splice(0)
    vi.clearAllMocks()
  })

  it('refreshes every matching bound element and reflows affected layout groups', async () => {
    groups.push({
      id: 'group-1',
      members: [{ elementId: 'data-1' }, { elementId: 'unit-1' }, { elementId: 'override-1' }],
    })
    configs.set('data-1', { id: 'data-1', eleType: 'data', dataProperty: 'data_1' })
    configs.set('unit-1', { id: 'unit-1', eleType: 'unit', dataProperty: 'data_1' })
    configs.set('override-1', { id: 'override-1', eleType: 'data', dataProperty: 'data_2' })
    configs.set('icon-1', { id: 'icon-1', eleType: 'icon', dataProperty: 'data_1' })
    elements.push(...Array.from(configs, ([id, config]) => ({ id, config })))

    await expect(syncMetricPropertyBindings('data_1', 'data')).resolves.toBe(3)

    expect(updateElementById).toHaveBeenCalledWith('data-1', expect.objectContaining({ text: '8.5 km' }))
    expect(updateElementById).toHaveBeenCalledWith('unit-1', expect.objectContaining({ text: 'km' }))
    expect(updateElementById).toHaveBeenCalledWith('icon-1', expect.objectContaining({ dataProperty: 'data_1' }))
    expect(updateElementById).not.toHaveBeenCalledWith('override-1', expect.anything())
    expect(reflow).toHaveBeenCalledWith('group-1')
    expect(syncBounds).toHaveBeenCalledWith('group-1')
    expect(requestRenderAll).toHaveBeenCalledOnce()
  })
})
