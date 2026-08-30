import { describe, expect, it } from 'vitest'

import { getSimulatedDataByName } from './dataSimulator'

describe('combined sunrise and sunset simulation', () => {
  it.each([
    ['before sunrise', new Date(2026, 7, 31, 6, 27), '06:42', 'sunrise'],
    ['during daytime', new Date(2026, 7, 31, 12, 0), '18:12', 'sunset'],
    ['after sunset', new Date(2026, 7, 31, 20, 0), '06:42', 'sunrise'],
  ])('shows the next solar event %s', (_phase, now, display, label) => {
    expect(getSimulatedDataByName('sunriseSunset', now)).toMatchObject({ display, label })
  })
})
