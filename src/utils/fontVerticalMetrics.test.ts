import { describe, expect, it } from 'vitest'
import { connectIqDrawOffsetY, fabricBaselineOffset } from './fontVerticalMetrics'


describe('font vertical metrics', () => {
  it('uses the same Fabric baseline offset as exported text elements', () => {
    expect(fabricBaselineOffset(96)).toBeCloseTo(30.15744)
  })

  it('aligns the Bodoni Moda 96px line box with the Studio BMFont preview', () => {
    const digitMetrics = [
      [48, 35, 74], [49, 36, 72], [50, 35, 73], [51, 35, 74], [52, 36, 72],
      [53, 31, 78], [54, 35, 74], [55, 36, 73], [56, 35, 74], [57, 35, 74],
    ].map(([codepoint, yoffset, height]) => ({ codepoint, yoffset, height }))

    expect(connectIqDrawOffsetY(96, 147, 108, digitMetrics)).toBe(4)
  })

  it('aligns the Antonio 96px Connect IQ line box with the Studio BMFont preview', () => {
    const digitMetrics = [
      [48, 26, 88], [49, 27, 86], [50, 26, 87], [51, 26, 88], [52, 27, 86],
      [53, 27, 87], [54, 26, 88], [55, 27, 86], [56, 26, 88], [57, 26, 87],
    ].map(([codepoint, yoffset, height]) => ({ codepoint, yoffset, height }))

    // Studio centers the 125px BMFont line box around the Fabric object's top.
    // Connect IQ positions the same line box from its 111px baseline.
    expect(connectIqDrawOffsetY(96, 125, 111, digitMetrics)).toBe(18)
  })

  it('returns zero when a package has no digit metrics', () => {
    expect(connectIqDrawOffsetY(96, 147, 108, [{ codepoint: 58, yoffset: 57, height: 52 }])).toBe(0)
  })
})
