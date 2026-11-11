import { describe, expect, it } from 'vitest'
import { resolveMetricIconGlyph, resolveMetricIconUnicode } from './metricIcon'

describe('metric icon resolution', () => {
  it('maps the legacy weekly running goal glyph to the shared running icon', () => {
    const metric = { metricSymbol: ':GOAL_TYPE_WEEKLY_RUN_DISTANCE', iconUnicode: '004a' }
    expect(resolveMetricIconUnicode(metric)).toBe('0046')
    expect(resolveMetricIconGlyph(metric)).toBe('F')
    expect(resolveMetricIconUnicode({ metricSymbol: metric.metricSymbol, icon: '004a' })).toBe('0046')
    expect(resolveMetricIconUnicode({ metricSymbol: metric.metricSymbol }, 'U+004A')).toBe('0046')
  })

  it('preserves other activity icons and explicitly configured running glyphs', () => {
    expect(resolveMetricIconUnicode({ metricSymbol: ':GOAL_TYPE_WEEKLY_CYCLING_DISTANCE', iconUnicode: '004b' })).toBe('004b')
    expect(resolveMetricIconUnicode({ metricSymbol: ':GOAL_TYPE_WEEKLY_RUN_DISTANCE', iconUnicode: 'e001' })).toBe('e001')
  })

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
