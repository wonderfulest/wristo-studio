import { describe, expect, it } from 'vitest'
import { createDefaultSunEventStyles } from './sunEvents.model'
import { decodeArcSunEvents, encodeArcSunEvents } from '../arcSunEvents/arcSunEvents.encoder'
import { arcSunEventsSchema } from '../arcSunEvents/arcSunEvents.schema'
import { decodeLineSunEvents, encodeLineSunEvents } from '../lineSunEvents/lineSunEvents.encoder'
import { lineSunEventsSchema } from '../lineSunEvents/lineSunEvents.schema'
import { resolveSunEventIndicatorSource, scaleArcSunEventsConfig, scaleLineSunEventsConfig } from './sunEvents.geometry'

const indicator = {
  imageSvg: 'https://cdn.example.com/now.svg',
  imageUrl: 'https://cdn.example.com/now.png',
  width: 12,
  height: 18,
}

describe('Sun Events encoders', () => {
  it('prefers the original SVG over an image preview URL', () => {
    expect(resolveSunEventIndicatorSource(indicator)).toBe(indicator.imageSvg)
  })

  it('bakes canvas scale and position into every Arc size field', () => {
    const config = {
      ...arcSunEventsSchema.defaultConfig,
      id: 'arc-scaled', eleType: 'arcSunEvents' as const,
      left: 100, top: 110, originX: 'center' as const, originY: 'center' as const,
      indicator: { ...arcSunEventsSchema.defaultConfig.indicator, orientation: 'outward' as const, radialOffset: 4 },
    }

    expect(scaleArcSunEventsConfig(config, 1.5, 130.4, 140.6)).toEqual(expect.objectContaining({
      left: 130,
      top: 141,
      radius: 135,
      strokeWidth: 15,
      indicator: expect.objectContaining({ width: 24, height: 24, radialOffset: 6 }),
    }))
  })

  it('bakes Line scale into the track while keeping the indicator size fixed', () => {
    const config = {
      ...lineSunEventsSchema.defaultConfig,
      id: 'line-scaled', eleType: 'lineSunEvents' as const,
      left: 100, top: 110, originX: 'center' as const, originY: 'center' as const,
      indicator: { ...lineSunEventsSchema.defaultConfig.indicator, width: 16, height: 20, offset: 4 },
    }

    expect(scaleLineSunEventsConfig(config, 1.5, 2, 130.4, 140.6)).toEqual(expect.objectContaining({
      left: 130,
      top: 141,
      length: 240,
      strokeWidth: 20,
      indicator: expect.objectContaining({ width: 16, height: 20, offset: 8 }),
    }))
  })

  it('shows the bundled sun SVG as the default current-time indicator', () => {
    for (const schema of [arcSunEventsSchema, lineSunEventsSchema]) {
      const source = schema.defaultConfig.indicator.imageSvg
      expect(source).toMatch(/^data:image\/svg\+xml/)
      expect(decodeURIComponent(source)).toContain('<path')
      expect(decodeURIComponent(source)).toContain('<circle')
      expect(decodeURIComponent(source)).toContain('#FFD54A')
      expect(schema.defaultConfig.indicator.imageUrl).toBe(source)
    }
  })

  it('defaults new and incomplete Arc Sun Events elements to a 90 degree start angle', () => {
    expect(arcSunEventsSchema.defaultConfig.startAngle).toBe(90)
    expect(encodeArcSunEvents({ id: 'arc-default' }).startAngle).toBe(90)
  })

  it('round-trips Arc geometry, phases, and indicator orientation', () => {
    const config = {
      id: 'arc-1', eleType: 'arcSunEvents' as const, left: 100, top: 110,
      originX: 'center' as const, originY: 'center' as const,
      radius: 70, strokeWidth: 8, startAngle: -90, angleRange: 300,
      counterClockwise: true, phases: createDefaultSunEventStyles(),
      indicator: { ...indicator, radialOffset: 3, orientation: 'inward' as const },
    }
    expect(encodeArcSunEvents(decodeArcSunEvents(config) as any)).toEqual(config)
  })

  it('round-trips Line geometry and indicator offset without a reverse field', () => {
    const config = {
      id: 'line-1', eleType: 'lineSunEvents' as const, left: 80, top: 90,
      originX: 'center' as const, originY: 'center' as const,
      length: 120, strokeWidth: 6, angle: 25, phases: createDefaultSunEventStyles(),
      indicator: { ...indicator, offset: -4 },
    }
    const encoded = encodeLineSunEvents(decodeLineSunEvents(config) as any)
    expect(encoded).toEqual(config)
    expect(encoded).not.toHaveProperty('reverse')
  })
})
