import { describe, expect, it } from 'vitest'
import { encodeArcSunEvents } from '../arcSunEvents/arcSunEvents.encoder'
import { arcSunEventsSchema } from '../arcSunEvents/arcSunEvents.schema'
import { buildArcSunEventObjects, createSunEventsGroup } from './sunEvents.renderer'
import type { ArcSunEventsElementConfig } from '@/types/elements/sunEvents'

describe('Arc Sun Events center export', () => {
  it('exports the circle center instead of the partial-arc bounding-box center', async () => {
    const config: ArcSunEventsElementConfig = {
      ...arcSunEventsSchema.defaultConfig,
      id: 'upper-half',
      eleType: 'arcSunEvents' as const,
      left: 227,
      top: 116.4,
      originX: 'center',
      originY: 'center',
      radius: 224,
      strokeWidth: 6,
      startAngle: 180,
      angleRange: 180,
      counterClockwise: false,
      indicator: {
        ...arcSunEventsSchema.defaultConfig.indicator,
        imageSvg: '', imageUrl: undefined,
        orientation: arcSunEventsSchema.defaultConfig.indicator.orientation as 'fixed' | 'inward' | 'outward',
      },
    }

    const group = createSunEventsGroup(await buildArcSunEventObjects(config), config)
    expect((group as any).__sunEventsCenterOffset.x).toBeCloseTo(0, 5)
    expect((group as any).__sunEventsCenterOffset.y).toBeCloseTo(112, 5)
    const encoded = encodeArcSunEvents(group as any)

    expect(encoded.left).toBe(227)
    expect(encoded.top).toBe(116.4)
    expect(encoded.centerX).toBeCloseTo(227, 5)
    expect(encoded.centerY).toBeCloseTo(228.4, 5)
  })
})
