import { describe, expect, it } from 'vitest'
import opentype from 'opentype.js'
import { resolveDataSelectionIconGlyph } from './dataSelectionIcon'

const font = opentype.loadSync(new URL('../assets/fonts/wristo-icon.ttf', import.meta.url).pathname)
const expectVisibleGlyph = (text: string) => {
  const glyph = font.charToGlyph(text)
  expect(glyph.index).toBeGreaterThan(0)
  expect(glyph.path.commands.length).toBeGreaterThan(0)
}

describe('default data selection icons', () => {
  it('maps missing weather characters to visible glyphs from the bundled font', () => {
    for (const code of ['0067', '0068', '006b']) {
      expect(font.charToGlyphIndex(String.fromCodePoint(parseInt(code, 16)))).toBe(0)
      expectVisibleGlyph(resolveDataSelectionIconGlyph({ iconUnicode: code }))
    }
  })
  it('preserves every existing default-font glyph, including the space-code icon', () => {
    for (let index = 1; index < font.glyphs.length; index++) {
      const glyph = font.glyphs.get(index)
      if (glyph.unicode == null || !glyph.path.commands.length) continue
      expect(resolveDataSelectionIconGlyph({ iconUnicode: glyph.unicode.toString(16) }))
        .toBe(String.fromCodePoint(glyph.unicode))
    }
  })
  it('uses a visible icon for absent, invalid and unsupported catalog codes', () => {
    for (const code of ['', 'unknown', 'e001', '110000']) {
      expectVisibleGlyph(resolveDataSelectionIconGlyph({ iconUnicode: code }))
    }
  })
})
