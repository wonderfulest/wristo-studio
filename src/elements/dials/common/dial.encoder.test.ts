import { describe, expect, it } from 'vitest'
import { decodeDial, encodeDial } from './dial.encoder'

describe('Dial color binding persistence', () => {
  it('encodes fill and fillProperty', () => {
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

    expect(encoded).toMatchObject({
      fill: '#9eea20',
      fillProperty: 'accentColor',
    })
  })

  it('decodes fill and fillProperty', () => {
    const decoded = decodeDial({
      eleType: 'tick60',
      imageUrl: '/tick60.svg',
      assetId: 60,
      fill: '#777777',
      fillProperty: 'minorColor',
    }) as any

    expect(decoded).toMatchObject({
      fill: '#777777',
      fillProperty: 'minorColor',
    })
  })
})
