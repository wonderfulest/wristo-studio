import { describe, expect, it } from 'vitest'
import { resolveSubDialBindingIssue } from './subDial.binding'

describe('subDial binding validation', () => {
  it('reports a stale property instead of silently falling back to a range', () => {
    expect(resolveSubDialBindingIssue({ dialProperty: 'dial_range_1', progressMode: 'range' }, undefined)).toBe(
      'Selected Dial Property is missing',
    )
  })

  it('reports mode and selected-option mismatches', () => {
    expect(resolveSubDialBindingIssue(
      { dialProperty: 'dial_goal_1', progressMode: 'goal' },
      { type: 'dial', dialMode: 'range', value: 9, options: [] },
    )).toBe('Dial Property mode does not match this Sub-dial')
    expect(resolveSubDialBindingIssue(
      { dialProperty: 'dial_range_1', progressMode: 'range' },
      { type: 'dial', dialMode: 'range', value: 9, options: [{ value: 9, dialMode: 'range', dialMin: 100, dialMax: 0 }] },
    )).toBe('Selected Dial data range is invalid')
  })

  it('accepts a complete Garmin goal binding', () => {
    expect(resolveSubDialBindingIssue(
      { dialProperty: 'dial_goal_1', progressMode: 'goal' },
      { type: 'dial', dialMode: 'goal', value: 1, options: [{ value: 1, dialMode: 'goal', dialGoalSource: 'garmin' }] },
    )).toBeNull()
  })
})
