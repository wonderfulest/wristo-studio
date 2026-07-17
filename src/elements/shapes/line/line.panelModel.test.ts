import { describe, expect, it } from 'vitest'
import { resolveLinePanelColor, resolveLinePanelWidth } from './line.panelModel'

describe('Line settings panel model', () => {
  it('reads the persisted line color instead of the Fabric rectangle fill', () => {
    expect(resolveLinePanelColor({ stroke: '#00AAFF', fill: '#FFFFFF' })).toBe('#00AAFF')
  })

  it('reads the persisted line width instead of the Fabric rectangle height', () => {
    expect(resolveLinePanelWidth({ strokeWidth: 6, height: 2 })).toBe(6)
  })

  it('falls back to Fabric rectangle fields when no persisted config is available', () => {
    expect(resolveLinePanelColor({ fill: '#FF5500' })).toBe('#FF5500')
    expect(resolveLinePanelWidth({ height: 4 })).toBe(4)
  })
})
