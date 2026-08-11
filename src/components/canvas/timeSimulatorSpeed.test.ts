import { describe, expect, it } from 'vitest'

import {
  TIME_SIMULATOR_SPEEDS,
  getSpeedAtSliderIndex,
  getSliderIndexForSpeed,
} from './timeSimulatorSpeed'

describe('time simulator speed steps', () => {
  it('uses manually predictable fast-forward multipliers', () => {
    expect(TIME_SIMULATOR_SPEEDS).toEqual([1, 2, 5, 10, 30, 60, 120, 300, 600, 1000])
  })

  it('maps each slider stop directly to its displayed multiplier', () => {
    expect(TIME_SIMULATOR_SPEEDS.map((_, index) => getSpeedAtSliderIndex(index))).toEqual(TIME_SIMULATOR_SPEEDS)
  })

  it('selects the nearest stop for an existing speed', () => {
    expect(getSliderIndexForSpeed(1)).toBe(0)
    expect(getSliderIndexForSpeed(60)).toBe(5)
    expect(getSliderIndexForSpeed(280)).toBe(7)
    expect(getSliderIndexForSpeed(Number.NaN)).toBe(0)
  })
})
