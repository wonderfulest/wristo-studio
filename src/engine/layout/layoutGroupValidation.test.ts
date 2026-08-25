import { describe, expect, it } from 'vitest'
import {
  LayoutGroupValidationError,
  normalizeAndValidateLayoutGroups,
  validateLayoutGroups,
} from './layoutGroupValidation'

const elements = [
  { id: 'data-1', eleType: 'data' },
  { id: 'unit-1', eleType: 'unit' },
  { id: 'icon-1', eleType: 'icon' },
  { id: 'line-1', eleType: 'line' },
] as any[]

const validGroup = {
  id: 'row-1',
  name: 'Battery Row',
  direction: 'horizontal',
  left: 227,
  top: 180,
  originX: 'center',
  members: [
    { elementId: 'data-1', gapBefore: 0, offsetY: 0 },
    { elementId: 'unit-1', gapBefore: 1, offsetY: 2 },
  ],
}

describe('layout group validation', () => {
  it('normalizes safe defaults without changing member order', () => {
    expect(normalizeAndValidateLayoutGroups([{ ...validGroup, name: ' ' }], elements)).toEqual([
      { ...validGroup, name: 'Layout Group 1' },
    ])
  })

  it.each([
    [[{ ...validGroup, id: '' }], 'layoutGroups[0].id'],
    [[{ ...validGroup, direction: 'vertical' }], 'layoutGroups[0].direction'],
    [[{ ...validGroup, originX: 'middle' }], 'layoutGroups[0].originX'],
    [[{ ...validGroup, left: Number.NaN }], 'layoutGroups[0].left'],
    [[{ ...validGroup, members: validGroup.members.slice(0, 1) }], 'layoutGroups[0].members'],
    [[{ ...validGroup, members: [...validGroup.members, { elementId: 'missing', gapBefore: 0, offsetY: 0 }] }], 'layoutGroups[0].members[2].elementId'],
    [[{ ...validGroup, members: [...validGroup.members, { elementId: 'line-1', gapBefore: 0, offsetY: 0 }] }], 'layoutGroups[0].members[2].elementId'],
    [[{ ...validGroup, members: [{ ...validGroup.members[0], gapBefore: Infinity }, validGroup.members[1]] }], 'layoutGroups[0].members[0].gapBefore'],
  ] as const)('reports a path for invalid input', (groups, path) => {
    expect(validateLayoutGroups(groups, elements).map((issue) => issue.path)).toContain(path)
  })

  it('rejects duplicate group ids and cross-group member ownership', () => {
    const issues = validateLayoutGroups([
      validGroup,
      {
        ...validGroup,
        members: [
          { elementId: 'data-1', gapBefore: 0, offsetY: 0 },
          { elementId: 'icon-1', gapBefore: 2, offsetY: 0 },
        ],
      },
    ], elements)

    expect(issues.map((issue) => issue.path)).toEqual(expect.arrayContaining([
      'layoutGroups[1].id',
      'layoutGroups[1].members[0].elementId',
    ]))
  })

  it('throws one error containing every invalid path', () => {
    expect(() => normalizeAndValidateLayoutGroups([
      { ...validGroup, top: Number.POSITIVE_INFINITY },
    ], elements)).toThrowError(LayoutGroupValidationError)
    expect(() => normalizeAndValidateLayoutGroups([
      { ...validGroup, top: Number.POSITIVE_INFINITY },
    ], elements)).toThrow('layoutGroups[0].top')
  })
})
