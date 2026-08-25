import { describe, expect, it } from 'vitest'
import type { LayerElement } from '@/types/layer'
import { buildLayerPanelItems, getGroupDeletionIds, getGroupLockTarget } from './layerPanelGrouping'

const layer = (id: string, dataProperty = ''): LayerElement => ({
  id, eleType: id.startsWith('unit') ? 'unit' : 'data', visible: true,
  displayStates: { active: true, ambient: true }, locked: false, selectable: true,
  element: { id, eleType: id.startsWith('unit') ? 'unit' : 'data', dataProperty },
})

describe('real layout groups in the layer panel', () => {
  it('takes precedence over inferred data-property groups and uses member order', () => {
    const items = buildLayerPanelItems(
      [layer('other', 'Battery'), layer('data-1', 'Battery'), layer('unit-1', 'Battery')],
      new Set(['layout:row-1']),
      [{
        id: 'row-1', name: 'Battery Row', direction: 'horizontal', left: 10, top: 20, originX: 'left',
        members: [
          { elementId: 'unit-1', gapBefore: 0, offsetY: 0 },
          { elementId: 'data-1', gapBefore: 0, offsetY: 0 },
        ],
      }],
    )

    const layoutItem = items.find((item) => item.kind === 'group' && item.source === 'layout')
    expect(layoutItem).toMatchObject({
      kind: 'group', source: 'layout', layoutGroupId: 'row-1', key: 'layout:row-1', label: 'Battery Row', isExpanded: true,
    })
    expect(layoutItem?.kind === 'group' && layoutItem.members.map((member) => member.id)).toEqual(['unit-1', 'data-1'])
    expect(items.filter((item) => item.kind === 'group' && item.source === 'inferred')).toHaveLength(0)
    expect(items.filter((item) => item.kind === 'layer').map((item: any) => item.layer.id)).toEqual(['other'])
  })

  it('locks every member unless the whole group is already locked', () => {
    expect(getGroupLockTarget([true, false, true])).toBe(true)
    expect(getGroupLockTarget([true, true, true])).toBe(false)
  })

  it('includes locked members when deleting a whole group', () => {
    const locked = layer('locked', 'Battery')
    locked.locked = true

    expect(getGroupDeletionIds([locked, layer('unlocked', 'Battery')])).toEqual(['locked', 'unlocked'])
  })
})
