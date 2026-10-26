import { afterEach, describe, expect, it, vi } from 'vitest'
import { Group, Path, Rect } from 'fabric'
import { arcSunEventsSchema } from '../arcSunEvents/arcSunEvents.schema'
import { curveSunEventsSchema } from '../curveSunEvents/curveSunEvents.schema'
import { lineSunEventsSchema } from '../lineSunEvents/lineSunEvents.schema'
import { buildArcSunEventObjects, buildCurveSunEventObjects, buildLineSunEventObjects } from './sunEvents.renderer'
import { curveIndicatorTransform } from './sunEvents.geometry'
import * as preview from './sunEvents.preview'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('sun events default indicator rendering', () => {
  it('draws one pure-color track in simple mode for Arc, Line, and Curve', async () => {
    vi.spyOn(preview, 'currentLocalDayFraction').mockReturnValue(0.5)
    const simple = { displayMode: 'simple' as const, simpleColor: '#12AB34' }
    const [arc, line, curve] = await Promise.all([
      buildArcSunEventObjects({ ...arcSunEventsSchema.defaultConfig, ...simple, id: 'simple-arc', eleType: 'arcSunEvents', originX: 'center', originY: 'center' } as any),
      buildLineSunEventObjects({ ...lineSunEventsSchema.defaultConfig, ...simple, id: 'simple-line', eleType: 'lineSunEvents', originX: 'center', originY: 'center' }),
      buildCurveSunEventObjects({ ...curveSunEventsSchema.defaultConfig, ...simple, id: 'simple-curve', eleType: 'curveSunEvents', originX: 'center', originY: 'center' } as any),
    ])

    expect(arc.slice(0, -1)).toHaveLength(2)
    expect(arc.slice(0, -1).every((object: any) => object.stroke === '#12AB34')).toBe(true)
    expect(line.slice(0, -1)).toHaveLength(1)
    expect(line[0]).toBeInstanceOf(Rect)
    expect((line[0] as any).fill).toBe('#12AB34')
    expect(curve.slice(0, -1)).toHaveLength(2)
    expect(curve.slice(0, -1).every((object: any) => object.stroke === '#12AB34')).toBe(true)
  })

  it('keeps the sun indicator during both daytime and nighttime', async () => {
    const fraction = vi.spyOn(preview, 'currentLocalDayFraction')
    fraction.mockReturnValue(0.5)
    const daytime = await buildLineSunEventObjects({
      ...lineSunEventsSchema.defaultConfig,
      id: 'day-line', eleType: 'lineSunEvents', originX: 'center', originY: 'center',
    })
    expect(daytime.at(-1)).toBeInstanceOf(Group)

    fraction.mockReturnValue(0.9)
    const nighttime = await buildLineSunEventObjects({
      ...lineSunEventsSchema.defaultConfig,
      id: 'night-line', eleType: 'lineSunEvents', originX: 'center', originY: 'center',
      indicator: { ...lineSunEventsSchema.defaultConfig.indicator, width: 18, height: 12, nightDotColor: '#345678' },
    })
    expect(nighttime.at(-1)).toBeInstanceOf(Group)
  })

  it('positions the indicator from an explicitly supplied preview time', async () => {
    const objects = await buildLineSunEventObjects({
      ...lineSunEventsSchema.defaultConfig,
      id: 'simulated-line', eleType: 'lineSunEvents', originX: 'center', originY: 'center',
    }, new Date(2026, 6, 13, 18, 0, 0))

    expect(objects.at(-1)).toEqual(expect.objectContaining({
      left: lineSunEventsSchema.defaultConfig.length / 4,
    }))
  })

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

it('loads the persisted default SVG even when it was uploaded as a binary asset', async () => {
  const { DEFAULT_SUN_EVENT_INDICATOR_SVG } = await import('./sunEvents.defaults')
  const svg = decodeURIComponent(DEFAULT_SUN_EVENT_INDICATOR_SVG.split(',')[1])
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => svg }))
  vi.stubGlobal('Image', class {
    onerror?: () => void
    set src(_url: string) { queueMicrotask(() => this.onerror?.()) }
  })
  const objects = await buildCurveSunEventObjects({
    ...curveSunEventsSchema.defaultConfig, id: 'legacy-bin', eleType: 'curveSunEvents',
    indicator: { ...curveSunEventsSchema.defaultConfig.indicator, imageSvg: 'https://cdn.test/legacy.bin' },
  } as any)
  expect(objects.at(-1)).toBeInstanceOf(Group)
})

it('reports a failed legacy asset request and permits retry', async () => {
  const { DEFAULT_SUN_EVENT_INDICATOR_SVG } = await import('./sunEvents.defaults')
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({ ok: true, text: async () => decodeURIComponent(DEFAULT_SUN_EVENT_INDICATOR_SVG.split(',')[1]) })
  vi.stubGlobal('fetch', fetcher)
  const config = {
    ...curveSunEventsSchema.defaultConfig, id: 'retry-bin', eleType: 'curveSunEvents',
    indicator: { ...curveSunEventsSchema.defaultConfig.indicator, imageSvg: 'https://cdn.test/retry.bin' },
  } as any
  await expect(buildCurveSunEventObjects(config)).rejects.toThrow('HTTP 503')
  expect((await buildCurveSunEventObjects(config)).at(-1)).toBeInstanceOf(Group)
})

it('rejects non-SVG binary assets with a readable error', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '<html>Error</html>' }))
  await expect(buildCurveSunEventObjects({
    ...curveSunEventsSchema.defaultConfig, id: 'invalid-bin', eleType: 'curveSunEvents',
    indicator: { ...curveSunEventsSchema.defaultConfig.indicator, imageSvg: 'https://cdn.test/invalid.bin' },
  } as any)).rejects.toThrow('does not contain SVG data')
})
