import { describe, expect, it } from 'vitest'
import { decodeDial, encodeDial } from './dial.encoder'

describe('Dial asset color persistence', () => {
  it('does not encode legacy fill and fillProperty', () => {
    const encoded = encodeDial(
      {
        id: 'tick-12',
        width: 454,
        height: 454,
        scaleX: 1,
        scaleY: 1,
        dialBaseSize: 454,
        fill: '#9eea20',
        fillProperty: 'accentColor',
        imageUrl: '/tick12.svg',
        assetId: 12,
      } as any,
      'tick12',
    )

    expect(encoded).not.toHaveProperty('fill')
    expect(encoded).not.toHaveProperty('fillProperty')
  })

  it('drops legacy fill and fillProperty while decoding', () => {
    const decoded = decodeDial({
      eleType: 'tick60',
      imageUrl: '/tick60.svg',
      assetId: 60,
      fill: '#777777',
      fillProperty: 'minorColor',
    } as any) as any

    expect(decoded).not.toHaveProperty('fill')
    expect(decoded).not.toHaveProperty('fillProperty')
  })
})
