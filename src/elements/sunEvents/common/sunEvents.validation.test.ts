import { describe, expect, it } from 'vitest'
import { createDefaultSunEventStyles } from './sunEvents.model'
import { validateSunEventsElement } from './sunEvents.validation'

describe('Sun Events export validation', () => {
  const base = {
    eleType: 'lineSunEvents',
    phases: createDefaultSunEventStyles(),
    indicator: { imageSvg: 'https://cdn.example.com/now.svg', width: 12, height: 12 },
  }

  it('requires a valid SVG current-time indicator', () => {
    expect(validateSunEventsElement({ ...base, indicator: { ...base.indicator, imageSvg: '' } })).toContain('SVG')
    expect(validateSunEventsElement({ ...base, indicator: { ...base.indicator, imageSvg: 'now.png' } })).toContain('SVG')
  })

  it('requires at least one enabled phase', () => {
    expect(validateSunEventsElement({
      ...base,
      phases: createDefaultSunEventStyles().map((phase) => ({ ...phase, enabled: false })),
    })).toContain('phase')
  })

  it('accepts a complete Sun Events element and ignores unrelated elements', () => {
    expect(validateSunEventsElement(base)).toBeNull()
    expect(validateSunEventsElement({ eleType: 'time' })).toBeNull()
  })

  it('validates Curve dimensions and indicator orientation', () => {
    const curve = {
      ...base,
      eleType: 'curveSunEvents',
      width: 180,
      height: 60,
      strokeWidth: 6,
      indicator: {
        ...base.indicator,
        normalOffset: 0,
        orientation: 'fixed',
      },
    }
    expect(validateSunEventsElement(curve)).toBeNull()
    expect(validateSunEventsElement({ ...curve, width: 0 })).toBe('Curve Sun Events width must be positive.')
    expect(validateSunEventsElement({ ...curve, height: 0 })).toBe('Curve Sun Events height must be positive.')
    expect(validateSunEventsElement({ ...curve, strokeWidth: 0 })).toBe('Curve Sun Events stroke width must be positive.')
    expect(validateSunEventsElement({
      ...curve,
      indicator: { ...curve.indicator, orientation: 'sideways' },
    })).toBe('Curve Sun Events indicator orientation is invalid.')
  })
})
