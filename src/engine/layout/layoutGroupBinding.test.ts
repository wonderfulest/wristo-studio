import { describe, expect, it } from 'vitest'
import {
  resolveLayoutGroupBindingState,
  type LayoutGroupBindableElement,
} from './layoutGroupBinding'

const member = (
  id: string,
  dataProperty: string | null = 'data_1',
  goalProperty: string | null = null,
): LayoutGroupBindableElement => ({ id, dataProperty, goalProperty })

describe('resolveLayoutGroupBindingState', () => {
  it('derives a synchronized data binding for legacy groups without binding metadata', () => {
    expect(resolveLayoutGroupBindingState(undefined, [
      member('value'),
      member('icon'),
      member('unit'),
    ])).toEqual({
      binding: { kind: 'data', propertyKey: 'data_1' },
      overriddenElementIds: [],
    })
  })

  it('reports members that differ from the persisted group binding', () => {
    expect(resolveLayoutGroupBindingState(
      { kind: 'data', propertyKey: 'data_1' },
      [member('value'), member('icon', 'data_2'), member('unit')],
    )).toEqual({
      binding: { kind: 'data', propertyKey: 'data_1' },
      overriddenElementIds: ['icon'],
    })
  })

  it('does not invent a baseline for a legacy group with mixed bindings', () => {
    expect(resolveLayoutGroupBindingState(undefined, [
      member('value', 'data_1'),
      member('icon', 'data_2'),
    ])).toEqual({
      binding: null,
      overriddenElementIds: [],
    })
  })

  it('treats data and goal bindings as mutually exclusive', () => {
    expect(resolveLayoutGroupBindingState(
      { kind: 'goal', propertyKey: 'goal_1' },
      [member('value', null, 'goal_1'), member('icon', 'data_1', null)],
    )).toEqual({
      binding: { kind: 'goal', propertyKey: 'goal_1' },
      overriddenElementIds: ['icon'],
    })
  })
})
