import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeIndicatorText, encodeIndicatorText } from './indicatorText.encoder'

describe('indicator text color property binding', () => {
  it('round-trips fillProperty through encode and decode', () => {
    const element = {
      id: 'bluetooth-1',
      left: 10,
      top: 20,
      originX: 'center',
      originY: 'center',
      fontFamily: 'wristo-icon',
      fontSize: 24,
      fill: '#112233',
      fillProperty: 'accentColor',
    }

    const encoded = encodeIndicatorText('bluetooth', element as any)

    expect(encoded).toMatchObject({
      fill: '#112233',
      fillProperty: 'accentColor',
    })
    expect(decodeIndicatorText('bluetooth', encoded)).toMatchObject({
      fill: '#112233',
      fillProperty: 'accentColor',
    })
  })

  it('propagates fillProperty through every shared renderer boundary', () => {
    const source = readFileSync(new URL('./indicatorText.renderer.ts', import.meta.url), 'utf8')

    expect(source).toContain('fillProperty: config.fillProperty')
    expect(source).toContain('(element as any).fillProperty ?? config.fillProperty')
    expect(source).toContain('fillProperty: patch.fillProperty')
    expect(source).toContain('fillProperty: (obj as any).fillProperty')
  })
})
