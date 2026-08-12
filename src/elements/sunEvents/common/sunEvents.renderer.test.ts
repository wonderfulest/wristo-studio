import { describe, expect, it } from 'vitest'
import { Group } from 'fabric'
import { lineSunEventsSchema } from '../lineSunEvents/lineSunEvents.schema'
import { buildLineSunEventObjects } from './sunEvents.renderer'

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
})
