import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('bitmap font maker route', () => {
  it('registers one authenticated lazy child beneath the existing layout', () => {
    const source = readFileSync(new URL('../../../router/index.ts', import.meta.url), 'utf8')
    const matches = source.match(/path: 'fonts\/bitmap-maker'/g) ?? []
    const start = source.indexOf("path: 'fonts/bitmap-maker'")
    const route = source.slice(start, source.indexOf('},', start) + 2)
    expect(matches).toHaveLength(1)
    expect(route).toContain("name: 'BitmapFontMaker'")
    expect(route).toContain("import('@/views/fonts/bitmap-maker/BitmapFontMaker.vue')")
    expect(route).toContain('requiresAuth: true')
  })

  it('keeps the TTF generator and SVG library editor behind the shared route', () => {
    const source = readFileSync(new URL('./BitmapFontMaker.vue', import.meta.url), 'utf8')
    expect(source).toContain("value: 'ttf'")
    expect(source).toContain("value: 'svg'")
    expect(source).toContain("import TtfBitmapFontMaker from './TtfBitmapFontMaker.vue'")
    expect(source).toContain("import IconLibrary from '../icons/IconLibrary.vue'")
    expect(source).toContain(':font-type="svgFontType"')
  })
})
