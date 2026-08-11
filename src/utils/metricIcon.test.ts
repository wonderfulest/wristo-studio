import { describe, expect, it } from 'vitest'
import { resolveMetricIconGlyph, resolveMetricIconUnicode } from './metricIcon'

describe('metric icon resolution', () => {
  it('prefers the canonical iconUnicode field over the legacy icon field', () => {
    const metric = { iconUnicode: '0062', icon: '0061' }

    expect(resolveMetricIconUnicode(metric)).toBe('0062')
    expect(resolveMetricIconGlyph(metric)).toBe('b')
  })

  it('keeps legacy metric icons working when iconUnicode is absent', () => {
    const metric = { icon: '0061' }

    expect(resolveMetricIconUnicode(metric)).toBe('0061')
    expect(resolveMetricIconGlyph(metric)).toBe('a')
  })

  it('uses the first non-empty fallback when the metric has no icon', () => {
    expect(resolveMetricIconUnicode(undefined, '', 'U+0063')).toBe('0063')
    expect(resolveMetricIconGlyph(undefined, '', 'U+0063')).toBe('c')
  })
})
