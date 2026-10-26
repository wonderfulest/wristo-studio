import { afterEach, expect, it, vi } from 'vitest'
import { prepareSunEventIndicator } from './sunEvents.assets'
import { DEFAULT_SUN_EVENT_INDICATOR_SVG } from './sunEvents.defaults'
import { curveSunEventsSchema } from '../curveSunEvents/curveSunEvents.schema'
import { encodeCurveSunEvents } from '../curveSunEvents/curveSunEvents.encoder'
import { validateSunEventsElement } from './sunEvents.validation'

afterEach(() => { vi.unstubAllGlobals() })

it('persists a verified legacy SVG source through encoding and export validation', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => decodeURIComponent(DEFAULT_SUN_EVENT_INDICATOR_SVG.split(',')[1]) }))
  const input = { ...curveSunEventsSchema.defaultConfig.indicator, imageSvg: 'https://cdn.test/export.bin', imageUrl: 'https://cdn.test/export.bin' }
  const indicator = await prepareSunEventIndicator(input)
  const encoded = encodeCurveSunEvents({ __element: { config: { ...curveSunEventsSchema.defaultConfig, id: 'legacy', indicator } } })
  expect(encoded.indicator.imageSvg).toBe(DEFAULT_SUN_EVENT_INDICATOR_SVG)
  expect(encoded.indicator.imageUrl).toBe(DEFAULT_SUN_EVENT_INDICATOR_SVG)
  expect(validateSunEventsElement(encoded)).toBeNull()
  expect(input.imageSvg).toBe('https://cdn.test/export.bin')
})

it('does not accept arbitrary binary content as SVG', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => 'not an SVG' }))
  await expect(prepareSunEventIndicator({ imageSvg: 'https://cdn.test/bad-export.bin' })).rejects.toThrow('does not contain SVG')
})
