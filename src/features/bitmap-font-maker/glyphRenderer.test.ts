import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { charsetForType, normalizeBitmapFontRecipe } from './contracts'
import { parseFontSource } from './fontSource'
import { createGlyphRendererSession, GlyphRenderError, rasterizeFallbackContours, registerUploadedFontFace, renderGlyphs, renderGlyphsPreferWorkerCanvas } from './glyphRenderer'

const fixtureUrl = new URL('./__fixtures__/minimal-latin.ttf', import.meta.url)

async function source() {
  const bytes = await readFile(fileURLToPath(fixtureUrl))
  return parseFontSource(new File([bytes], 'minimal-latin.ttf'))
}

const recipe = (changes: Partial<Parameters<typeof normalizeBitmapFontRecipe>[0]> = {}) =>
  normalizeBitmapFontRecipe({
    schemaVersion: 1,
    rendererVersion: '1',
    fontWeight: 400,
    italicAngle: 0,
    outlineWidthEm: 0,
    outlineMode: 'fill',
    ...changes
  })

describe('renderGlyphs', () => {
  it('renders uploaded glyph alpha and preserves space advance against one baseline', async () => {
    const result = renderGlyphs(await source(), [32, 65], 48, recipe())
    const letter = result.glyphs.find((glyph) => glyph.codepoint === 65)!
    const space = result.glyphs.find((glyph) => glyph.codepoint === 32)!

    expect(letter.alpha.some((alpha) => alpha > 0)).toBe(true)
    const rows = Array.from({ length: letter.height }, (_, y) => letter.alpha.slice(y * letter.width, (y + 1) * letter.width))
    expect(rows[0].some((alpha) => alpha > 0)).toBe(true)
    expect(rows.at(-1)!.some((alpha) => alpha > 0)).toBe(true)
    expect(space.xadvance).toBeGreaterThan(0)
    expect(result.baseline).toBeGreaterThan(0)
    expect(result.diagnostics).toEqual({ rendererPath: 'opentype-path', rendererVersion: '1' })
  })

  it('expands bounds for outline and shears horizontal bounds for italic', async () => {
    const parsed = await source()
    const plain = renderGlyphs(parsed, [65], 60, recipe()).glyphs[0]
    const outlined = renderGlyphs(parsed, [65], 60, recipe({ outlineWidthEm: 0.08, outlineMode: 'fill-outline' })).glyphs[0]
    const uprightStem = renderGlyphs(parsed, [73], 60, recipe()).glyphs[0]
    const italic = renderGlyphs(parsed, [73], 60, recipe({ italicAngle: 14 })).glyphs[0]

    expect(outlined.width).toBeGreaterThan(plain.width)
    expect(outlined.height).toBeGreaterThan(plain.height)
    expect([italic.width, italic.xoffset]).not.toEqual([uprightStem.width, uprightStem.xoffset])
  })

  it('applies synthetic weight and supports outline-only alpha', async () => {
    const parsed = await source()
    const regular = renderGlyphs(parsed, [79], 60, recipe()).glyphs[0]
    const bold = renderGlyphs(parsed, [79], 60, recipe({ fontWeight: 700 })).glyphs[0]
    const outlineOnly = renderGlyphs(parsed, [79], 60, recipe({ outlineWidthEm: 0.06, outlineMode: 'outline-only' })).glyphs[0]

    const coverage = (alpha: Uint8Array) => alpha.filter((value) => value > 0).length
    expect(coverage(bold.alpha)).toBeGreaterThan(coverage(regular.alpha))
    expect(coverage(outlineOnly.alpha)).toBeGreaterThan(0)
    expect(coverage(outlineOnly.alpha)).toBeLessThan(outlineOnly.width * outlineOnly.height)
  })

  it('keeps fill, fill-outline, and outline-only rendering semantics distinct', async () => {
    const parsed = await source()
    const plain = renderGlyphs(parsed, [79], 120, recipe()).glyphs[0]
    const fillWithIgnoredOutlineWidth = renderGlyphs(parsed, [79], 120, recipe({ outlineWidthEm: 0.04, outlineMode: 'fill' })).glyphs[0]
    const fillOutline = renderGlyphs(parsed, [79], 120, recipe({ outlineWidthEm: 0.04, outlineMode: 'fill-outline' })).glyphs[0]
    const outlineOnly = renderGlyphs(parsed, [79], 120, recipe({ outlineWidthEm: 0.04, outlineMode: 'outline-only' })).glyphs[0]

    expect(fillWithIgnoredOutlineWidth).toEqual(plain)
    expect(fillOutline.width).toBeGreaterThan(plain.width)
    expect(fillOutline.height).toBeGreaterThan(plain.height)

    const alphaAtWorldPoint = (glyph: typeof plain, worldX: number, worldY: number) => {
      const x = worldX - glyph.xoffset
      const y = worldY - glyph.yoffset
      if (x < 0 || y < 0 || x >= glyph.width || y >= glyph.height) return 0
      return glyph.alpha[y * glyph.width + x]
    }
    const hasRemovedFillPixel = plain.alpha.some((alpha, index) => {
      if (alpha === 0) return false
      const worldX = plain.xoffset + (index % plain.width)
      const worldY = plain.yoffset + Math.floor(index / plain.width)
      return alphaAtWorldPoint(outlineOnly, worldX, worldY) === 0
    })
    expect(hasRemovedFillPixel).toBe(true)

    const outlinedStem = renderGlyphs(parsed, [73], 120, recipe({ outlineWidthEm: 0.02, outlineMode: 'outline-only' })).glyphs[0]
    expect(outlinedStem.alpha[Math.floor(outlinedStem.height / 2) * outlinedStem.width + Math.floor(outlinedStem.width / 2)]).toBe(0)
  })

  it('uses non-zero winding for overlapping and reversed contours', () => {
    const clockwise = [
      { x: 1, y: 1 },
      { x: 7, y: 1 },
      { x: 7, y: 7 },
      { x: 1, y: 7 },
      { x: 1, y: 1 }
    ]
    const bounds = { left: 0, top: 0, width: 9, height: 9 }
    const sameDirection = rasterizeFallbackContours([clockwise, clockwise], bounds, true, 0)
    const reversedInner = rasterizeFallbackContours(
      [
        clockwise,
        [
          { x: 2, y: 2 },
          { x: 2, y: 6 },
          { x: 6, y: 6 },
          { x: 6, y: 2 },
          { x: 2, y: 2 }
        ]
      ],
      bounds,
      true,
      0
    )

    expect(sameDirection[4 * bounds.width + 4]).toBe(255)
    expect(reversedInner[4 * bounds.width + 4]).toBe(0)
  })

  it('renders the English text charset at a representative large size within a broad budget', async () => {
    const startedAt = performance.now()
    const result = renderGlyphs(await source(), charsetForType('text_font').codepoints, 144, recipe())

    expect(result.glyphs.length).toBe(charsetForType('text_font').codepoints.length)
    expect(performance.now() - startedAt).toBeLessThan(8_000)
  }, 10_000)

  it('rejects a missing uploaded-font glyph with a stable error', async () => {
    const parsed = await source()
    expect(() => renderGlyphs(parsed, [0x4e2d], 30, recipe())).toThrowError(expect.objectContaining<Partial<GlyphRenderError>>({ code: 'GLYPH_MISSING' }))
  })

  it('rejects a mapped non-space glyph whose uploaded outline is empty', async () => {
    const parsed = await source()
    const spaceGlyph = parsed.font.charToGlyph(' ')
    parsed.supportedCodepoints.add(0xe000)
    parsed.font.charToGlyph = () => spaceGlyph

    expect(() => renderGlyphs(parsed, [0xe000], 30, recipe())).toThrowError(expect.objectContaining<Partial<GlyphRenderError>>({ code: 'GLYPH_RENDER_EMPTY' }))
  })

  it('does not claim a FontFace renderer when worker font APIs are unavailable', async () => {
    expect(await registerUploadedFontFace(await source(), 700, {})).toBeUndefined()
    class NoCleanupFontFace {
      async load() {
        return this
      }
    }
    expect(
      await registerUploadedFontFace(await source(), 700, {
        FontFace: NoCleanupFontFace,
        fonts: { add: () => undefined }
      })
    ).toBeUndefined()
  })

  it('uses a source-byte family identity and cleans up repeated FontFace registrations', async () => {
    const faces = new Set<object>()
    class TestFontFace {
      constructor(
        public family: string,
        public source: ArrayBuffer,
        public descriptors: { weight: string }
      ) {}
      async load() {
        return this
      }
    }
    const environment = {
      FontFace: TestFontFace,
      fonts: { add: (face: object) => faces.add(face), delete: (face: object) => faces.delete(face) }
    }
    const parsed = await source()
    const first = await registerUploadedFontFace(parsed, 700, environment)
    const second = await registerUploadedFontFace(parsed, 700, environment)

    expect(first?.family).toMatch(/^WristoUploaded-[0-9a-f]{16}$/)
    expect(second?.family).toBe(first?.family)
    expect(faces.size).toBe(2)
    first?.dispose()
    first?.dispose()
    second?.dispose()
    expect(faces.size).toBe(0)
  })

  it('selects the worker FontFace canvas path when every required API is available', async () => {
    class TestFontFace {
      constructor(public family: string) {}
      async load() {
        return this
      }
    }
    class TestCanvas {
      width: number
      height: number
      constructor(width: number, height: number) {
        this.width = width
        this.height = height
      }
      getContext() {
        return {
          font: '',
          textBaseline: 'alphabetic',
          lineJoin: 'round',
          lineWidth: 0,
          measureText: () => ({ width: 30, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 30, actualBoundingBoxAscent: 35, actualBoundingBoxDescent: 5 }),
          fillText: () => undefined,
          strokeText: () => undefined,
          getImageData: (_x: number, _y: number, width: number, height: number) => {
            const data = new Uint8ClampedArray(width * height * 4)
            for (let index = 3; index < data.length; index += 4) data[index] = 255
            return { data }
          }
        }
      }
    }
    const faces = new Set<object>()
    const result = await renderGlyphsPreferWorkerCanvas(await source(), [65], 48, recipe({ fontWeight: 700 }), {
      FontFace: TestFontFace,
      OffscreenCanvas: TestCanvas,
      fonts: { add: (face: object) => faces.add(face), delete: (face: object) => faces.delete(face) }
    })

    expect(result.diagnostics).toEqual({ rendererPath: 'font-face-canvas', rendererVersion: '1' })
    expect(result.glyphs[0].alpha.some((alpha) => alpha > 0)).toBe(true)
    expect(faces.size).toBe(0)
  })

  it('reuses one FontFace registration across multiple session sizes and disposes once', async () => {
    let loads = 0
    let adds = 0
    let deletes = 0
    class TestFontFace {
      async load() {
        loads += 1
        return this
      }
    }
    class TestCanvas {
      constructor(_width: number, _height: number) {}
      getContext() {
        return {
          font: '',
          textBaseline: 'alphabetic',
          lineJoin: 'round',
          lineWidth: 0,
          measureText: () => ({ width: 20, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 20, actualBoundingBoxAscent: 20, actualBoundingBoxDescent: 4 }),
          fillText: () => undefined,
          strokeText: () => undefined,
          getImageData: (_x: number, _y: number, width: number, height: number) => {
            const data = new Uint8ClampedArray(width * height * 4)
            for (let i = 3; i < data.length; i += 4) data[i] = 255
            return { data }
          }
        }
      }
    }
    const environment = {
      FontFace: TestFontFace,
      OffscreenCanvas: TestCanvas,
      fonts: {
        add: () => {
          adds += 1
        },
        delete: () => {
          deletes += 1
          return true
        }
      }
    }
    const session = await createGlyphRendererSession(await source(), environment)
    session.render(24, recipe(), [65])
    session.render(48, recipe(), [65])
    session.dispose()
    session.dispose()
    expect({ loads, adds, deletes, rendererPath: session.rendererPath }).toEqual({ loads: 1, adds: 1, deletes: 1, rendererPath: 'font-face-canvas' })
  })

  it('falls back after FontFace load failure and supports finally cleanup after render errors', async () => {
    class FailedFontFace {
      async load(): Promise<FailedFontFace> {
        throw new Error('load failed')
      }
    }
    const parsed = await source()
    const session = await createGlyphRendererSession(parsed, {
      FontFace: FailedFontFace,
      OffscreenCanvas: class {
        getContext() {
          return null
        }
      },
      fonts: { add: () => undefined, delete: () => true }
    })
    try {
      expect(session.rendererPath).toBe('opentype-path')
      expect(session.render(24, recipe(), [65]).diagnostics.rendererPath).toBe('opentype-path')
      expect(() => session.render(24, recipe(), [0x4e2d])).toThrowError()
    } finally {
      session.dispose()
    }
    expect(() => session.render(24, recipe(), [65])).toThrowError(expect.objectContaining({ code: 'GLYPH_RENDER_INVALID_INPUT' }))
  })

  it('validates standard sizes, source metrics, outline-only width, and oversized bounds before allocation', async () => {
    const parsed = await source()
    for (const size of [0, 13, Number.NaN, Number.POSITIVE_INFINITY, 8192]) {
      expect(() => renderGlyphs(parsed, [65], size, recipe())).toThrowError(expect.objectContaining({ code: 'GLYPH_RENDER_INVALID_INPUT' }))
    }
    expect(() => renderGlyphs({ ...parsed, unitsPerEm: 0 }, [65], 24, recipe())).toThrowError(expect.objectContaining({ code: 'GLYPH_RENDER_INVALID_INPUT' }))
    expect(() => renderGlyphs({ ...parsed, ascender: Number.NaN }, [65], 24, recipe())).toThrowError(expect.objectContaining({ code: 'GLYPH_RENDER_INVALID_INPUT' }))
    expect(() => renderGlyphs(parsed, [65], 24, recipe({ outlineMode: 'outline-only', outlineWidthEm: 0 }))).toThrowError(expect.objectContaining({ code: 'GLYPH_OUTLINE_REQUIRED' }))

    const glyph = parsed.font.charToGlyph('A')
    glyph.getPath = () => ({ commands: [{ type: 'M', x: 0, y: 0 }, { type: 'L', x: 9000, y: 0 }, { type: 'L', x: 9000, y: 10 }, { type: 'Z' }] }) as ReturnType<typeof glyph.getPath>
    expect(() => renderGlyphs(parsed, [65], 24, recipe())).toThrowError(expect.objectContaining({ code: 'GLYPH_RENDER_TOO_LARGE' }))
  })
})
