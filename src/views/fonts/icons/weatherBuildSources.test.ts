import { describe, expect, it, vi } from 'vitest'
import { WEATHER_FONT_SLOTS } from '@/features/bitmap-font-maker/weatherSourceSet'
import { loadWeatherBuildSources } from './weatherBuildSources'

describe('loadWeatherBuildSources', () => {
  it('loads twelve SVGs in canonical weather-code order', async () => {
    const relations = [...WEATHER_FONT_SLOTS].reverse().map((slot, index) => ({
      id: index + 1,
      glyphId: 7,
      assetId: index + 10,
      version: 1,
      isActive: 1,
      icon: { id: index + 20, iconUnicode: slot.iconUnicode, symbolCode: slot.symbolCode, category: 'weather', label: slot.label, isActive: 1 },
      asset: { id: index + 10, iconId: index + 20, sourceType: 'custom', format: 'svg', svgContent: `<svg viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>` }
    }))

    const sources = await loadWeatherBuildSources(relations, vi.fn())

    expect(sources.map((source) => source.iconUnicode)).toEqual(WEATHER_FONT_SLOTS.map((slot) => slot.iconUnicode))
  })

  it('fails before building when a standard slot has no SVG', async () => {
    await expect(loadWeatherBuildSources([], vi.fn())).rejects.toThrow('WEATHER_SOURCE_SET_INCOMPLETE')
  })
})
