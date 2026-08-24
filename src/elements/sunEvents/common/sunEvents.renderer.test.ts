import { afterEach, describe, expect, it, vi } from 'vitest'
import { Group, Path } from 'fabric'
import { curveSunEventsSchema } from '../curveSunEvents/curveSunEvents.schema'
import { lineSunEventsSchema } from '../lineSunEvents/lineSunEvents.schema'
import { buildCurveSunEventObjects, buildLineSunEventObjects } from './sunEvents.renderer'
import { curveIndicatorTransform } from './sunEvents.geometry'
import * as preview from './sunEvents.preview'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sun events default indicator rendering', () => {
  it('draws the bundled sun without loading it through an HTML image', async () => {
    const objects = await buildLineSunEventObjects({
      ...lineSunEventsSchema.defaultConfig,
      id: 'line-with-default-sun',
      eleType: 'lineSunEvents',
      originX: 'center',
      originY: 'center',
      indicator: { ...lineSunEventsSchema.defaultConfig.indicator },
    })

    const indicator = objects.at(-1)
    expect(indicator).toBeInstanceOf(Group)
    expect((indicator as Group).getObjects()).toHaveLength(9)
  })

  it('draws exact colored Curve paths and places the bundled sun at the peak', async () => {
    vi.spyOn(preview, 'currentLocalDayFraction').mockReturnValue(0.5)
    const config = {
      ...curveSunEventsSchema.defaultConfig,
      id: 'curve-with-default-sun',
      eleType: 'curveSunEvents' as const,
      originX: 'center' as const,
      originY: 'center' as const,
      indicator: {
        ...curveSunEventsSchema.defaultConfig.indicator,
        orientation: 'fixed' as const,
      },
    }

    const objects = await buildCurveSunEventObjects(config)
    const paths = objects.slice(0, -1)
    expect(paths.length).toBeGreaterThan(1)
    expect(paths.every((object) => object instanceof Path)).toBe(true)

    const indicator = objects.at(-1)
    const peak = curveIndicatorTransform({
      fraction: 0.5,
      width: config.width,
      height: config.height,
      normalOffset: config.indicator.normalOffset,
      orientation: config.indicator.orientation,
    })
    expect(indicator).toBeInstanceOf(Group)
    expect(indicator).toEqual(expect.objectContaining({ left: peak.x, top: peak.y, angle: peak.angle }))
  })
})
