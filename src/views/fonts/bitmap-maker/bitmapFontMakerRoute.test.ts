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
})
