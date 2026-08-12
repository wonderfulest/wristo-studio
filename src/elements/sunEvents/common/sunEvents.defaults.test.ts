import { describe, expect, it } from 'vitest'
import { DEFAULT_SUN_EVENT_INDICATOR_SVG, normalizeSunEventIndicator } from './sunEvents.defaults'

describe('sun events default indicator', () => {
  it('uses a small compatible yellow sun SVG', () => {
    const svg = decodeURIComponent(DEFAULT_SUN_EVENT_INDICATOR_SVG.split(',', 2)[1])

    expect(svg).toContain('viewBox="0 0 30 30"')
    expect(svg).toContain('#FFD54A')
    expect(svg).toContain('<circle')
    expect(svg).toContain('stroke-linecap="round"')
    expect(svg).not.toContain('<filter')
    expect(svg).not.toContain('<rect')
  })

  it('restores the bundled sun when a new element has no indicator source', () => {
    expect(normalizeSunEventIndicator({ width: 20, height: 18 })).toEqual(expect.objectContaining({
      imageSvg: DEFAULT_SUN_EVENT_INDICATOR_SVG,
      imageUrl: DEFAULT_SUN_EVENT_INDICATOR_SVG,
      width: 20,
      height: 18,
    }))
  })

  it('keeps a selected custom indicator', () => {
    expect(normalizeSunEventIndicator({ imageSvg: '/custom.svg', width: 12, height: 14 })).toEqual(expect.objectContaining({
      imageSvg: '/custom.svg',
      width: 12,
      height: 14,
    }))
  })
})
