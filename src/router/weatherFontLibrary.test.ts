// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import router from './index'

describe('weather font library route', () => {
  it('registers a dedicated authenticated editor route', () => {
    const route = router.getRoutes().find((item) => item.name === 'WeatherFontLibrary')

    expect(route?.path).toBe('/weather-font-library')
    expect(route?.meta.requiresAuth).toBe(true)
  })

  it('uses the shared SVG-to-BMFont builder instead of the TTF build action', () => {
    const source = readFileSync(`${process.cwd()}/src/views/fonts/icons/IconLibrary.vue`, 'utf8')
    expect(source).toContain('<WeatherBitmapBuildDialog')
    expect(source).toContain('@click="openSvgBitmapBuilder"')
    expect(source).not.toContain('router.push(svgBitmapMakerLocation')
    expect(source).not.toContain("import { svgBitmapMakerLocation }")
    expect(source).not.toContain('autoIconFontBuild')
    expect(source).not.toContain('submitIconGlyph')
  })
})
