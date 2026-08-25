import { describe, expect, it } from 'vitest'
import { resolveLayoutGroupClipboardSelection } from './layoutGroupClipboardSelection'

describe('layout group clipboard selection', () => {
  it('keeps ordinary elements when copying them together with a layout group', () => {
    const ordinary = { id: 'ordinary-1', eleType: 'text' }
    const member1 = { id: 'member-1', eleType: 'icon' }
    const member2 = { id: 'member-2', eleType: 'data' }

    const result = resolveLayoutGroupClipboardSelection(
      [ordinary],
      [ordinary, member1, member2],
      ['row-1'],
      [{
        id: 'row-1',
        name: 'Row 1',
        direction: 'horizontal',
        originX: 'left',
        left: 10,
        top: 20,
        members: [
          { elementId: 'member-1', gapBefore: 0, offsetY: 0 },
          { elementId: 'member-2', gapBefore: 4, offsetY: 0 },
        ],
      }],
    )

    expect(result.objects).toEqual([ordinary, member1, member2])
    expect(result.layoutGroups.map((group) => group.id)).toEqual(['row-1'])
  })

  it('does not duplicate a group member already present in the active objects', () => {
    const member1 = { id: 'member-1', eleType: 'icon' }
    const member2 = { id: 'member-2', eleType: 'data' }

    const result = resolveLayoutGroupClipboardSelection(
      [member1],
      [member1, member2],
      ['row-1'],
      [{
        id: 'row-1',
        name: 'Row 1',
        direction: 'horizontal',
        originX: 'left',
        left: 10,
        top: 20,
        members: [
          { elementId: 'member-1', gapBefore: 0, offsetY: 0 },
          { elementId: 'member-2', gapBefore: 4, offsetY: 0 },
        ],
      }],
    )

    expect(result.objects).toEqual([member1, member2])
  })
})
