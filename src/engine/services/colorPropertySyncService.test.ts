import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildBoundColorPatches } from './colorPropertySync'

describe('buildBoundColorPatches', () => {
  it('updates every color field explicitly bound to the changed property', () => {
    const patches = buildBoundColorPatches([
      {
        id: 'text-1',
        eleType: 'text',
        fill: '#FFFFFF',
        fillProperty: 'accentColor',
      },
      {
        id: 'battery-1',
        eleType: 'battery',
        bodyStrokeProperty: 'accentColor',
        bodyFillProperty: 'surfaceColor',
        levelColorLowProperty: 'accentColor',
      },
    ], 'accentColor', '0xFFAA00')

    expect(patches).toEqual(new Map([
      ['text-1', { fill: '#ffaa00' }],
      ['battery-1', {
        bodyStroke: '#ffaa00',
        levelColorLow: '#ffaa00',
      }],
    ]))
  })

  it('merges duplicate store and canvas records by element id', () => {
    const patches = buildBoundColorPatches([
      { id: 'icon-1', fillProperty: 'accentColor' },
      { id: 'icon-1', fillProperty: 'accentColor' },
    ], 'accentColor', '#123456')

    expect(patches).toEqual(new Map([
      ['icon-1', { fill: '#123456' }],
    ]))
  })

  it('ignores invalid colors and unrelated bindings', () => {
    expect(buildBoundColorPatches([
      { id: 'text-1', fillProperty: 'otherColor' },
      { fillProperty: 'accentColor' },
    ], 'accentColor', 'invalid')).toEqual(new Map())
  })

  it.each([
    'src/components/properties/PropertiesPanel.vue',
    'src/components/panels/settings/ThemeConfigSettings.vue',
  ])('%s uses the shared bound-color synchronization', (file) => {
    const source = readFileSync(new URL(`../../../${file}`, import.meta.url), 'utf8')

    expect(source).toContain('syncColorPropertyToBoundElements')
  })
})
