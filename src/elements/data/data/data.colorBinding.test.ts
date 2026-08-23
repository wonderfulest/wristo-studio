import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeData, encodeData } from './data.encoder'

describe('data color property binding', () => {
  it('round-trips fillProperty through encode and decode', () => {
    const encoded = encodeData({
      id: 'data-1',
      eleType: 'data',
      left: 10,
      top: 20,
      originX: 'center',
      originY: 'center',
      fill: '#FFAA00',
      fillProperty: 'accentColor',
      fontSize: 24,
      fontFamily: 'roboto-condensed-regular',
      dataProperty: 'data_1',
    } as any)

    expect(encoded.fillProperty).toBe('accentColor')
    expect(decodeData(encoded).fillProperty).toBe('accentColor')
  })

  it('uses the property-change event in the panel', () => {
    const source = readFileSync(new URL('./data.panel.vue', import.meta.url), 'utf8')

    expect(source).toContain(':property-key="currentModel.fillProperty"')
    expect(source).toContain('@property-change="handleColorSelection"')
    expect(source).toContain('fillProperty: selection.propertyKey')
    expect(source).toContain(':type="FontTypes.TEXT_FONT"')
    expect(source).not.toContain('FontTypes.DATA_FONT')
  })
})
