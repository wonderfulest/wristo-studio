import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeIcon, encodeIcon } from './icon.encoder'

describe('icon color property binding', () => {
  it('round-trips fillProperty through encode and decode', () => {
    const encoded = encodeIcon({
      id: 'icon-1',
      eleType: 'icon',
      left: 10,
      top: 20,
      fill: '#FFAA00',
      fillProperty: 'accentColor',
      fontSize: 24,
      fontFamily: 'wristo-icon',
      dataProperty: 'data_1',
    } as any)

    expect(encoded.fillProperty).toBe('accentColor')
    expect(decodeIcon(encoded).fillProperty).toBe('accentColor')
  })

  it('uses the property-change event in the panel', () => {
    const source = readFileSync(new URL('./icon.panel.vue', import.meta.url), 'utf8')

    expect(source).toContain(':property-key="currentModel.fillProperty"')
    expect(source).toContain('@property-change="handleColorSelection"')
    expect(source).toContain('fillProperty: selection.propertyKey')
  })

  it('lets a static color clear an existing binding during renderer updates', () => {
    const source = readFileSync(new URL('./icon.renderer.ts', import.meta.url), 'utf8')

    expect(source).toContain(
      'config.fillProperty !== undefined ? config.fillProperty : (obj as any).fillProperty',
    )
  })
})
