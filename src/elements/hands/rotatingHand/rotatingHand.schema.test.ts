import { describe, expect, it } from 'vitest'
import { rotatingHandSchema } from './rotatingHand.schema'

describe('rotating hand schema', () => {
  it('defines a repeatable, data-driven image hand with stable defaults', () => {
    expect(rotatingHandSchema).toMatchObject({
      type: 'rotatingHand',
      resizable: false,
      rotatable: false,
      defaultConfig: {
        progressMode: 'range',
        previewProgress: 50,
        startAngle: 150,
        endAngle: 390,
        counterClockwise: false,
        outOfRangeBehavior: 'clamp',
        centerX: 227,
        centerY: 227,
        pivotOffsetX: 0,
        pivotOffsetY: 0,
        scalePercent: 100,
      },
    })
  })
})
