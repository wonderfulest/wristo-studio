import { describe, expect, it } from 'vitest'
import {
  SUN_EVENT_PHASES,
  createDefaultSunEventStyles,
  normalizeSunEventSegments,
  timeFractionToArcAngle,
  timeFractionToLinePoint,
} from './sunEvents.model'

describe('Sun Events shared model', () => {
  it('keeps the fixed phase order shared by Arc and Line', () => {
    expect(SUN_EVENT_PHASES.map((phase) => phase.key)).toEqual([
      'midnight',
      'astronomicalDawn',
      'nauticalDawn',
      'civilDawn',
      'blueHourAm',
      'sunrise',
      'sunriseEnd',
      'goldenHourAm',
      'noon',
      'goldenHourPm',
      'sunset',
      'sunsetEnd',
      'blueHourPm',
      'civilDusk',
      'nauticalDusk',
      'astronomicalDusk',
    ])
    expect(createDefaultSunEventStyles()).toHaveLength(16)
  })

  it('fills disabled and missing phases with the previous active color', () => {
    const styles = createDefaultSunEventStyles().map((style) => ({ ...style, enabled: false }))
    styles[1] = { ...styles[1], enabled: true, color: '#001122' }
    styles[4] = { ...styles[4], enabled: true, color: '#334455' }

    const segments = normalizeSunEventSegments({
      styles,
      events: {
        astronomicalDawn: 0.2,
        blueHourAm: 0.4,
      },
    })

    expect(segments).toEqual([
      { start: 0, end: 0.2, color: '#334455', phase: 'blueHourAm' },
      { start: 0.2, end: 0.4, color: '#001122', phase: 'astronomicalDawn' },
      { start: 0.4, end: 1, color: '#334455', phase: 'blueHourAm' },
    ])
  })

  it('falls back to one full-day segment when no event boundary is available', () => {
    const styles = createDefaultSunEventStyles().map((style, index) => ({
      ...style,
      enabled: index === 3,
      color: index === 3 ? '#ABCDEF' : style.color,
    }))

    expect(normalizeSunEventSegments({ styles, events: {} })).toEqual([
      { start: 0, end: 1, color: '#ABCDEF', phase: 'civilDawn' },
    ])
  })

  it('maps the current local-day fraction to Arc and Line geometry', () => {
    expect(timeFractionToArcAngle(0.25, 90, 180, false)).toBe(135)
    expect(timeFractionToArcAngle(0.25, 90, 180, true)).toBe(45)
    expect(timeFractionToLinePoint(0.25, 10, 110)).toBe(35)
  })
})
