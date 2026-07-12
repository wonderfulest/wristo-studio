import { describe, expect, it } from 'vitest'
import { buildLayerPanelItems, expandPanelItemsToLayerIds, findCollapsedGroupsForLayerIds, getLayerGroupKey, resolvePanelItemsToCanvasIds, retainExistingExpandedGroups } from './layerPanelGrouping'
import type { LayerElement } from '@/types/layer'

const layer = (id: string, group = ''): LayerElement => ({
  id,
  eleType: 'data',
  visible: true,
  displayStates: { active: true, ambient: true },
  locked: false,
  selectable: true,
  element: { id, eleType: 'data', dataProperty: group }
})

describe('layerPanelGrouping', () => {
  it('collapses two matching layers into one group item by default', () => {
    const items = buildLayerPanelItems([layer('steps-label', 'Steps'), layer('steps-value', 'Steps')])

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'group', key: 'Steps', label: 'Steps' })
    expect(items[0].kind === 'group' && items[0].members.map((item) => item.id)).toEqual(['steps-label', 'steps-value'])
  })

  it('keeps ungrouped and singleton layers as normal items', () => {
    const items = buildLayerPanelItems([layer('time'), layer('steps', 'Steps')])

    expect(items.map((item) => item.kind)).toEqual(['layer', 'layer'])
  })

  it('expands virtual groups into real IDs without duplicates', () => {
    const items = buildLayerPanelItems([layer('time'), layer('steps-label', 'Steps'), layer('steps-value', 'Steps')])

    expect(expandPanelItemsToLayerIds(items)).toEqual(['time', 'steps-label', 'steps-value'])
  })

  it('drops expansion keys for groups that no longer exist', () => {
    const items = buildLayerPanelItems([layer('time'), layer('steps', 'Steps')])

    expect([...retainExistingExpandedGroups(new Set(['Steps']), items)]).toEqual([])
  })

  it('uses the existing group-key precedence', () => {
    expect(getLayerGroupKey({ element: { groupId: 'group', dataProperty: 'Steps' } } as any)).toBe('group')
  })

  it('marks an expanded group while retaining its summary item', () => {
    const items = buildLayerPanelItems([layer('steps-label', 'Steps'), layer('steps-value', 'Steps')], new Set(['Steps']))

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'group', key: 'Steps', isExpanded: true })
  })

  it('finds a collapsed group for one canvas-selected member only', () => {
    const items = buildLayerPanelItems([layer('time'), layer('steps-label', 'Steps'), layer('steps-value', 'Steps')])

    expect(findCollapsedGroupsForLayerIds(items, ['steps-value'])).toEqual(['Steps'])
    expect(findCollapsedGroupsForLayerIds(items, ['time'])).toEqual([])
    expect(findCollapsedGroupsForLayerIds(items, ['steps-label', 'steps-value'])).toEqual([])
  })

  it('converts a moved collapsed group into bottom-to-top canvas order', () => {
    const items = buildLayerPanelItems([layer('time'), layer('steps-label', 'Steps'), layer('steps-value', 'Steps'), layer('date')])
    const moved = [items[1], items[0], items[2]]

    expect(resolvePanelItemsToCanvasIds(moved)).toEqual(['date', 'time', 'steps-value', 'steps-label'])
  })
})
