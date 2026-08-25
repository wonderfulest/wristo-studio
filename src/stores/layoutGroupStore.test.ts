// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useElementDataStore } from './elementDataStore'
import { useLayoutGroupStore } from './layoutGroupStore'

const seedElements = () => {
  const store = useElementDataStore()
  store.upsertElement({ id: 'data-1', eleType: 'data', left: 10, top: 20 } as any)
  store.upsertElement({ id: 'unit-1', eleType: 'unit', left: 30, top: 20 } as any)
  store.upsertElement({ id: 'icon-1', eleType: 'icon', left: 0, top: 20 } as any)
}

const row = {
  id: 'row-1',
  name: 'Battery Row',
  direction: 'horizontal' as const,
  left: 50,
  top: 20,
  originX: 'center' as const,
  members: [
    { elementId: 'data-1', gapBefore: 0, offsetY: 0 },
    { elementId: 'unit-1', gapBefore: 1, offsetY: 2 },
  ],
}

describe('layoutGroupStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    seedElements()
  })

  it('creates a group and indexes member ownership', () => {
    const store = useLayoutGroupStore()
    store.createGroup(row)

    expect(store.findGroupByElementId('unit-1')?.id).toBe('row-1')
    expect(store.snapshot()).toEqual([row])
  })

  it('rejects adding an element that already belongs to another group', () => {
    const store = useLayoutGroupStore()
    store.createGroup(row)

    expect(() => store.createGroup({
      ...row,
      id: 'row-2',
      members: [row.members[0], { elementId: 'icon-1', gapBefore: 2, offsetY: 0 }],
    })).toThrow('layoutGroups[1].members[0].elementId')
  })

  it('updates anchors and member settings and reorders members', () => {
    const store = useLayoutGroupStore()
    store.createGroup(row)
    store.updateGroup('row-1', { left: 100, originX: 'right' })
    store.updateMember('row-1', 'unit-1', { gapBefore: 4, offsetY: -1 })
    store.reorderMembers('row-1', ['unit-1', 'data-1'])

    expect(store.groups[0]).toMatchObject({ left: 100, originX: 'right' })
    expect(store.groups[0].members).toEqual([
      { elementId: 'unit-1', gapBefore: 4, offsetY: -1 },
      { elementId: 'data-1', gapBefore: 0, offsetY: 0 },
    ])
  })

  it('auto-dissolves a group after removing it down to one member', () => {
    const store = useLayoutGroupStore()
    store.createGroup(row)

    const result = store.removeMember('row-1', 'unit-1')

    expect(result).toMatchObject({ autoDissolved: true, remainingElementIds: ['data-1'] })
    expect(store.groups).toEqual([])
  })

  it('hydrates a detached snapshot and rejects damaged references', () => {
    const store = useLayoutGroupStore()
    store.hydrate([row])
    const snapshot = store.snapshot()
    snapshot[0].members[0].gapBefore = 99
    expect(store.groups[0].members[0].gapBefore).toBe(0)

    expect(() => store.hydrate([{
      ...row,
      members: [row.members[0], { elementId: 'missing', gapBefore: 0, offsetY: 0 }],
    }])).toThrow('layoutGroups[0].members[1].elementId')
  })
})
