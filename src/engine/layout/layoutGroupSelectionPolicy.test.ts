import { describe, expect, it } from 'vitest'
import type { HorizontalLayoutGroupConfig } from '@/types/layoutGroup'
import { resolveAtomicLayoutSelection } from './layoutGroupSelectionPolicy'

const groups: HorizontalLayoutGroupConfig[] = [
  {
    id: 'row-1',
    name: 'Heart rate',
    direction: 'horizontal',
    left: 100,
    top: 100,
    originX: 'left',
    members: [
      { elementId: 'icon-1', gapBefore: 0, offsetY: 0 },
      { elementId: 'data-1', gapBefore: 2, offsetY: 0 },
      { elementId: 'unit-1', gapBefore: 2, offsetY: 0 },
    ],
  },
  {
    id: 'row-2',
    name: 'Date',
    direction: 'horizontal',
    left: 100,
    top: 150,
    originX: 'left',
    members: [
      { elementId: 'date-1', gapBefore: 0, offsetY: 0 },
      { elementId: 'label-1', gapBefore: 2, offsetY: 0 },
    ],
  },
]

describe('resolveAtomicLayoutSelection', () => {
  it('leaves a selection without layout-group objects unchanged', () => {
    expect(resolveAtomicLayoutSelection([
      { id: 'text-1', eleType: 'text' },
      { id: 'image-1', eleType: 'image' },
    ], groups)).toEqual({ kind: 'unchanged' })
  })

  it('replaces layout-group members with their owning group while retaining ordinary elements', () => {
    const text = { id: 'text-1', eleType: 'text' }

    expect(resolveAtomicLayoutSelection([
      { id: 'icon-1', eleType: 'icon' },
      text,
      { id: 'data-1', eleType: 'data' },
    ], groups)).toEqual({
      kind: 'replace',
      objects: [text],
      groupIds: ['row-1'],
    })
  })

  it('collapses members from one layout group to that group', () => {
    expect(resolveAtomicLayoutSelection([
      { id: 'icon-1', eleType: 'icon' },
      { id: 'data-1', eleType: 'data' },
    ], groups)).toEqual({
      kind: 'replace',
      objects: [],
      groupIds: ['row-1'],
    })
  })

  it('replaces members of multiple layout groups with both owning groups', () => {
    expect(resolveAtomicLayoutSelection([
      { id: 'icon-1', eleType: 'icon' },
      { id: 'date-1', eleType: 'date' },
    ], groups)).toEqual({
      kind: 'replace',
      objects: [],
      groupIds: ['row-1', 'row-2'],
    })
  })

  it('does not replace an already-selected layout-group proxy', () => {
    expect(resolveAtomicLayoutSelection([
      { id: 'layout-group:row-1', eleType: 'layoutGroupProxy', layoutGroupId: 'row-1' },
    ], groups)).toEqual({ kind: 'unchanged' })
  })

  it('keeps a layout-group proxy as an atomic item beside an ordinary element', () => {
    const text = { id: 'text-1', eleType: 'text' }

    expect(resolveAtomicLayoutSelection([
      { id: 'layout-group:row-1', eleType: 'layoutGroupProxy', layoutGroupId: 'row-1' },
      text,
    ], groups)).toEqual({
      kind: 'replace',
      objects: [text],
      groupIds: ['row-1'],
    })
  })
})
