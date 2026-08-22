import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('AppMenu Bitmap Fonts entry', () => {
  it('opens the bitmap font maker in a new tab', () => {
    const source = readFileSync(new URL('./AppMenu.vue', import.meta.url), 'utf8')

    expect(source).toContain('index="navigation/bitmap-fonts" @click="handleOpenBitmapFonts"')
    expect(source).toContain('<span>Bitmap Fonts</span>')
    expect(source).toContain(
      "const handleOpenBitmapFonts = () => openRouteInNewTab(router, { name: 'BitmapFontMaker' })",
    )
  })
})
