import { describe, expect, it } from 'vitest'
import { svgBitmapMakerLocation } from './svgBitmapMakerNavigation'

describe('svgBitmapMakerLocation', () => {
  it('opens the shared generator in SVG mode for an icon library', () => {
    expect(svgBitmapMakerLocation('icon_font', 'outdoor-icons')).toEqual({
      name: 'BitmapFontMaker',
      query: { source: 'svg', fontType: 'icon_font', glyphCode: 'outdoor-icons' },
    })
  })

  it('omits an unavailable glyph code', () => {
    expect(svgBitmapMakerLocation('weather_font')).toEqual({
      name: 'BitmapFontMaker',
      query: { source: 'svg', fontType: 'weather_font' },
    })
  })
})
