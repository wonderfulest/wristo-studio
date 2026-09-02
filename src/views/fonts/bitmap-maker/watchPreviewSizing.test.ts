import { describe, expect, it } from 'vitest'
import { WATCH_PREVIEW_DIAMETERS, chooseWatchPreviewDiameter } from './watchPreviewSizing'

describe('chooseWatchPreviewDiameter', () => {
  it('uses only the four approved watch sizes and changes tier only when content no longer fits', () => {
    expect(WATCH_PREVIEW_DIAMETERS).toEqual([240, 360, 390, 454])
    expect(chooseWatchPreviewDiameter(180, 40)).toBe(240)
    expect(chooseWatchPreviewDiameter(205, 40)).toBe(240)
    expect(chooseWatchPreviewDiameter(210, 40)).toBe(360)
    expect(chooseWatchPreviewDiameter(320, 50)).toBe(360)
    expect(chooseWatchPreviewDiameter(340, 50)).toBe(390)
    expect(chooseWatchPreviewDiameter(390, 60)).toBe(454)
    expect(chooseWatchPreviewDiameter(500, 80)).toBe(454)
  })
})
