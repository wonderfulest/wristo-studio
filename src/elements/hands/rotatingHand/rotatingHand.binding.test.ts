import { describe, expect, it } from 'vitest'
import { resolveRotatingHandBindingIssue } from './rotatingHand.binding'

const config = { id: 'rh-1', dialProperty: 'dial_goal_1', progressMode: 'goal' as const }

describe('resolveRotatingHandBindingIssue', () => {
  it('accepts a compatible Dial Property', () => {
    expect(resolveRotatingHandBindingIssue(config, {
      type: 'dial',
      dialMode: 'goal',
      value: 1,
      options: [{ value: 1, metricSymbol: ':GOAL_TYPE_STEPS', dialMode: 'goal' }],
    })).toBeNull()
  })

  it('rejects a missing binding', () => {
    expect(resolveRotatingHandBindingIssue({ ...config, dialProperty: '' }, undefined))
      .toBe('Rotating Hand requires a Dial Property.')
  })

  it('rejects a Dial Property with the wrong mode', () => {
    expect(resolveRotatingHandBindingIssue(config, {
      type: 'dial',
      dialMode: 'range',
      value: 1,
      options: [{ value: 1, metricSymbol: ':FIELD_TYPE_BATTERY', dialMode: 'range' }],
    })).toBe('Rotating Hand mode does not match its Dial Property.')
  })

  it('rejects a selected option without a canonical metric symbol', () => {
    expect(resolveRotatingHandBindingIssue(config, {
      type: 'dial',
      dialMode: 'goal',
      value: 1,
      options: [{ value: 1, dialMode: 'goal' }],
    })).toBe('Rotating Hand Dial Property has no canonical metric symbol.')
  })

  it('accepts a degree-based Direction option', () => {
    expect(resolveRotatingHandBindingIssue({
      ...config,
      dialProperty: 'dial_direction_1',
      progressMode: 'direction',
    }, {
      type: 'dial',
      dialMode: 'direction',
      value: 5,
      options: [{
        value: 5,
        metricSymbol: ':FIELD_TYPE_WEATHER_WIND_DIRECTION',
        dialMode: 'direction',
        dialDirectionUnit: 'degree',
      }],
    })).toBeNull()
  })

  it('rejects a Direction option without degree metadata', () => {
    expect(resolveRotatingHandBindingIssue({
      ...config,
      dialProperty: 'dial_direction_1',
      progressMode: 'direction',
    }, {
      type: 'dial',
      dialMode: 'direction',
      value: 5,
      options: [{
        value: 5,
        metricSymbol: ':FIELD_TYPE_WEATHER_WIND_DIRECTION',
        dialMode: 'direction',
      }],
    })).toBe('Rotating Hand Direction option must use degrees.')
  })
})
