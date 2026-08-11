import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getSimulatedClockSnapshot,
  pauseSimulatedClock,
  resetSimulatedClock,
  resumeSimulatedClock,
  setSimulatedSpeed,
  setSimulatedTime,
} from './simulatedClock'

describe('simulatedClock fixed and running modes', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-11T08:00:00.000Z'))
    resetSimulatedClock()
  })

  it('keeps a selected date and time fixed while real time advances', () => {
    setSimulatedTime(new Date('2030-02-03T04:05:06.000Z'))
    pauseSimulatedClock()

    vi.advanceTimersByTime(60_000)

    const snapshot = getSimulatedClockSnapshot()
    expect(snapshot.currentTime).toEqual(new Date('2030-02-03T04:05:06.000Z'))
    expect(snapshot.isRunning).toBe(false)
    expect(snapshot.speedMultiplier).toBe(0)
  })

  it('resumes from the fixed instant at the selected speed', () => {
    setSimulatedTime(new Date('2030-02-03T04:05:06.000Z'))
    pauseSimulatedClock()
    resumeSimulatedClock(60)

    vi.advanceTimersByTime(1_000)

    const snapshot = getSimulatedClockSnapshot()
    expect(snapshot.currentTime).toEqual(new Date('2030-02-03T04:06:06.000Z'))
    expect(snapshot.isRunning).toBe(true)
    expect(snapshot.speedMultiplier).toBe(60)
  })

  it('reports direct zero-speed updates as fixed mode', () => {
    setSimulatedSpeed(0)
    expect(getSimulatedClockSnapshot().isRunning).toBe(false)
  })
})
