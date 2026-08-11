import { describe, expect, it } from 'vitest'
import { DEFAULT_SUN_EVENT_INDICATOR_SVG } from './sunEvents.defaults'

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
})
