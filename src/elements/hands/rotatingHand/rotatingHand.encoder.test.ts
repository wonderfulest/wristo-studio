import { describe, expect, it } from 'vitest'
import { decodeRotatingHand, encodeRotatingHand } from './rotatingHand.encoder'

describe('rotating hand encoder', () => {
  it('round-trips data, rotation, asset, and pivot geometry fields', () => {
    const live = {
      id: 'rh-1',
      eleType: 'rotatingHand',
      originX: 'center',
      originY: 'center',
      imageUrl: 'pointer.svg',
      assetId: 42,
      dialProperty: 'dial_range_1',
      progressMode: 'range',
      previewProgress: 65,
      startAngle: 150,
      endAngle: 390,
      counterClockwise: true,
      outOfRangeBehavior: 'hide',
      centerX: 110,
      centerY: 120,
      pivotOffsetX: 2,
      pivotOffsetY: 18,
      scalePercent: 75,
    } as any

    const encoded = encodeRotatingHand(live)
    expect(encoded).toMatchObject(live)
    expect(decodeRotatingHand(encoded)).toMatchObject({
      eleType: 'rotatingHand',
      left: 110,
      top: 120,
      centerX: 110,
      centerY: 120,
      pivotOffsetX: 2,
      pivotOffsetY: 18,
      scalePercent: 75,
      dialProperty: 'dial_range_1',
      angle: 84,
    })
  })

  it('round-trips Direction bearing and north-angle fields', () => {
    const encoded = encodeRotatingHand({
      id: 'rh-direction',
      eleType: 'rotatingHand',
      progressMode: 'direction',
      dialProperty: 'dial_direction_1',
      previewBearing: 90,
      northAngle: 270,
      centerX: 227,
      centerY: 227,
    } as any)

    expect(encoded).toMatchObject({
      progressMode: 'direction',
      previewBearing: 90,
      northAngle: 270,
    })
    expect(decodeRotatingHand(encoded)).toMatchObject({ angle: 90 })
  })
})
