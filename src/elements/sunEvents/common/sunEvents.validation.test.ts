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
})
