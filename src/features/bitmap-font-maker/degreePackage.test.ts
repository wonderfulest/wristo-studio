import { readFile } from 'node:fs/promises'
import { Font } from 'opentype.js'
import JSZip from 'jszip'
import { expect, it } from 'vitest'
import { BITMAP_FONT_SIZES, normalizeBitmapFontRecipe } from './contracts'
import { parseFontSource } from './fontSource'
import { createGlyphRendererSession } from './glyphRenderer'
import { buildBitmapFontPackage, type AtlasPixels } from './packageBuilder'
import { parseBmFontText } from '../bitmap-font-preview/bmFontTextParser'

it.each([false, true])('packs a visible degree at all sizes when the TTF lacks it (preserveSource=%s)', async preserveSource => {
  const bytes = await readFile(new URL('./__fixtures__/minimal-latin.ttf', import.meta.url))
  const original = await parseFontSource(new File([bytes], 'fixture.ttf'))
  const glyphs = Array.from({ length: original.font.glyphs.length }, (_, index) => original.font.glyphs.get(index))
    .filter(glyph => !glyph.unicodes.includes(176))
  glyphs.forEach((glyph, index) => { glyph.name ||= `glyph${index}` })
  const source = new Font({ familyName: 'No degree', styleName: 'Regular', unitsPerEm: original.unitsPerEm,
    ascender: original.ascender, descender: original.descender, glyphs }).toArrayBuffer()
  const parsed = await parseFontSource(new File([source], 'fixture.ttf'))
  expect(parsed.supportedCodepoints.has(176)).toBe(false)
  const atlases: AtlasPixels[] = []
  const result = await buildBitmapFontPackage({ source, fileName: 'fixture.ttf', slug: 'no-degree',
    fontType: 'text_font', preserveSource,
    recipe: normalizeBitmapFontRecipe({ schemaVersion: 1, rendererVersion: '1', fontWeight: 400, italicAngle: 0, outlineWidthEm: 0, outlineMode: 'fill' }),
  }, {
    parseSource: async () => parsed,
    createRendererSession: source => createGlyphRendererSession(source, {}),
    // Node has no OffscreenCanvas. Inspect the real atlas pixels handed to the encoder.
    encodePng: async atlas => { atlases.push(atlas); return Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]) },
  })
  expect(result.manifest.charset.codepoints.filter(code => code === 176)).toEqual([176])
  const zip = await JSZip.loadAsync(result.zip)
  expect(await zip.file('no-degree.ttf')!.async('arraybuffer')).toEqual(source)
  const layout = JSON.parse(await zip.file('connectiq-layout.json')!.async('string'))
  for (const [index, size] of BITMAP_FONT_SIZES.entries()) {
    const descriptor = parseBmFontText(await zip.file(`${size}/no-degree-g.fnt`)!.async('string'))
    const degree = descriptor.glyphs.get(176)!
    expect(degree, `degree at size ${size}`).toBeDefined()
    expect(degree.width).toBeGreaterThan(0)
    expect(degree.xadvance).toBeGreaterThanOrEqual(degree.xoffset + degree.width)
    const atlas = atlases[index]
    let visible = false
    for (let y = degree.y; y < degree.y + degree.height; y += 1) {
      for (let x = degree.x; x < degree.x + degree.width; x += 1) {
        visible ||= atlas.rgba[(y * atlas.width + x) * 4 + 3] > 0
      }
    }
    expect(visible).toBe(true)
    expect(layout.sizes[size].glyphs['176'].advance).toBeGreaterThan(0)
  }
}, 30000)
