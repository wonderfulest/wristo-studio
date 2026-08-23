import JSZip from 'jszip'
import { describe, expect, it, vi } from 'vitest'
import { BITMAP_FONT_SIZES, type BitmapFontRecipe } from './contracts'
import type { ParsedFontSource } from './fontSource'
import type { GlyphRendererSession, RenderedGlyphSet } from './glyphRenderer'
import {
  BuildCancelledError,
  buildBitmapFontPackage,
  canonicalJson,
  encodePngWithOffscreenCanvas,
  sha256Hex,
} from './packageBuilder'

const recipe: BitmapFontRecipe = {
  schemaVersion: 1,
  rendererVersion: '1',
  fontWeight: 400,
  italicAngle: 0,
  outlineWidthEm: 0,
  outlineMode: 'fill',
  lineJoin: 'round',
  antialias: true,
}

const parsedSource = {
  bytes: new Uint8Array([1, 2, 3, 4]),
  family: 'Fixture',
} as ParsedFontSource

const png = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lAEsWQAAAABJRU5ErkJggg=='),
  (character) => character.charCodeAt(0),
)

function rendered(size: number): RenderedGlyphSet {
  return {
    glyphs: [{ codepoint: 48, width: 1, height: 1, xoffset: 0, yoffset: 0, xadvance: size, alpha: new Uint8Array([255]) }],
    lineHeight: size,
    baseline: Math.max(1, size - 1),
    diagnostics: { rendererPath: 'opentype-path', rendererVersion: '1' },
  }
}

function adapters(options?: {
  onRender?: (size: number) => void
  render?: (size: number) => RenderedGlyphSet
  onRelease?: () => void
  encodePng?: () => Promise<Uint8Array>
  hash?: typeof sha256Hex
  generateZip?: () => Promise<ArrayBuffer>
}) {
  const dispose = vi.fn()
  const session: GlyphRendererSession = {
    rendererPath: 'opentype-path',
    render(size) {
      options?.onRender?.(size)
      return options?.render?.(size) ?? rendered(size)
    },
    dispose,
  }
  return {
    dispose,
    value: {
      parseSource: vi.fn(async () => parsedSource),
      createRendererSession: vi.fn(async () => session),
      encodePng: vi.fn(options?.encodePng ?? (async () => png.slice())),
      hash: options?.hash,
      generateZip: options?.generateZip,
      releaseSizeArtifacts: vi.fn(options?.onRelease ?? (() => undefined)),
    },
  }
}

describe('buildBitmapFontPackage', () => {
  it('builds the canonical 38-size package with 80 root-relative entries and valid descriptors', async () => {
    const fixture = adapters()
    const progress: unknown[] = []
    const result = await buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer,
      fileName: 'Fixture.TTF',
      slug: 'fixture-outline',
      fontType: 'time_font',
      recipe,
    }, fixture.value, (event) => progress.push(event))

    const archive = await JSZip.loadAsync(result.zip)
    const paths = Object.keys(archive.files).filter((path) => !archive.files[path].dir).sort()
    expect(paths).toHaveLength(80)
    expect(paths).toContain('fixture-outline.ttf')
    expect(paths).toContain('recipe.json')
    expect(paths).toContain('manifest.json')
    expect(paths).toContain('connectiq-layout.json')
    expect(paths).toContain('6/fixture-outline-g.fnt')
    expect(paths).toContain('312/fixture-outline-g_0.png')
    expect(paths.some((path) => path.startsWith('fixture-outline/'))).toBe(false)

    const fnt = await archive.file('6/fixture-outline-g.fnt')!.async('string')
    expect(fnt).toContain('info face="Fixture" size=-6')
    expect(fnt).toContain('page id=0 file="fixture-outline-g_0.png"')
    const archivedPng = new Uint8Array(await archive.file('6/fixture-outline-g_0.png')!.async('arraybuffer'))
    expect(archivedPng.slice(0, 8)).toEqual(png.slice(0, 8))
    expect(new TextDecoder().decode(archivedPng.slice(-8, -4))).toBe('IEND')
    expect(progress).toEqual(BITMAP_FONT_SIZES.map((size, index) => ({ completed: index + 1, size, total: 38 })))
    expect(fixture.dispose).toHaveBeenCalledOnce()
  })

  it('writes Connect IQ-safe metrics for glyphs whose bitmap overhangs their advance', async () => {
    const fixture = adapters({
      render: (size) => ({
        glyphs: [
          { codepoint: 48, width: 45, height: 1, xoffset: 1, yoffset: 0, xadvance: 30, alpha: new Uint8Array(45).fill(255) },
          { codepoint: 49, width: 39, height: 1, xoffset: -1, yoffset: 0, xadvance: 28, alpha: new Uint8Array(39).fill(255) },
        ],
        lineHeight: size,
        baseline: Math.max(1, size - 1),
        diagnostics: { rendererPath: 'opentype-path', rendererVersion: '1' },
      }),
    })
    const result = await buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer,
      fileName: 'Fixture.ttf',
      slug: 'fixture-overhang',
      fontType: 'time_font',
      recipe,
    }, fixture.value)

    const archive = await JSZip.loadAsync(result.zip)
    const fnt = await archive.file('144/fixture-overhang-g.fnt')!.async('string')
    expect(fnt).toMatch(/char id=48 .* width=45 height=1 xoffset=1 yoffset=0 xadvance=46 /)
    expect(fnt).toMatch(/char id=49 .* width=39 height=1 xoffset=0 yoffset=0 xadvance=39 /)
    const layout = JSON.parse(await archive.file('connectiq-layout.json')!.async('string'))
    expect(layout).toMatchObject({
      schemaVersion: 1,
      sizes: {
        144: {
          drawOffsetY: 26,
          glyphs: {
            48: { advance: 30, drawOffsetX: 0 },
            49: { advance: 28, drawOffsetX: -1 },
          },
        },
      },
    })
  })

  it('writes stable hashes and a complete manifest while excluding manifest.json from content hash', async () => {
    const fixture = adapters()
    const result = await buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.otf', slug: 'fixture', fontType: 'time_font', recipe,
    }, fixture.value)
    const archive = await JSZip.loadAsync(result.zip)
    const manifest = JSON.parse(await archive.file('manifest.json')!.async('string'))
    const recipeBytes = new TextEncoder().encode(await archive.file('recipe.json')!.async('string'))
    expect(manifest).toEqual(result.manifest)
    expect(manifest.sizes).toEqual([...BITMAP_FONT_SIZES])
    expect(manifest.charset.profile).toBe('wristo-time-v1')
    expect(manifest.source).toEqual({ fileName: 'fixture.otf', sha256: await sha256Hex(parsedSource.bytes) })
    expect(manifest.recipeSha256).toBe(await sha256Hex(recipeBytes))

    const materials: string[] = []
    for (const path of Object.keys(archive.files).filter((path) => !archive.files[path].dir && path !== 'manifest.json').sort()) {
      materials.push(`${path}\0${await sha256Hex(new Uint8Array(await archive.file(path)!.async('arraybuffer')))}\n`)
    }
    expect(manifest.packageContentSha256).toBe(await sha256Hex(new TextEncoder().encode(materials.join(''))))
    expect(await archive.file('manifest.json')!.async('string')).toBe(canonicalJson(manifest))
  })

  it('marks Chinese text font packages as Chinese', async () => {
    const result = await buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer,
      fileName: 'Fixture.ttf',
      slug: 'fixture-chinese',
      fontType: 'text_font_zh',
      recipe,
    }, adapters().value)

    expect(result.manifest.language).toBe('zh')
  })

  it('rejects unsafe names and always disposes the renderer on cancellation', async () => {
    let cancelled = false
    const fixture = adapters({ onRender: () => { cancelled = true } })
    await expect(buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: '../Fixture.ttf', slug: 'fixture', fontType: 'time_font', recipe,
    }, fixture.value)).rejects.toMatchObject({ code: 'UNSAFE_SOURCE_FILENAME' })
    await expect(buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.ttf', slug: '../fixture', fontType: 'time_font', recipe,
    }, fixture.value)).rejects.toThrow('Bitmap font slug')

    const progress = vi.fn()
    await expect(buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.ttf', slug: 'fixture', fontType: 'time_font', recipe,
    }, fixture.value, progress, () => cancelled)).rejects.toBeInstanceOf(BuildCancelledError)
    expect(progress).not.toHaveBeenCalled()
    expect(fixture.dispose).toHaveBeenCalledOnce()
  })

  it('releases each size before continuing and keeps retained size artifacts bounded', async () => {
    let retained = 0
    let peak = 0
    const fixture = adapters({
      onRender: () => { retained += 1; peak = Math.max(peak, retained) },
      onRelease: () => { retained -= 1 },
    })
    await buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.ttf', slug: 'fixture', fontType: 'time_font', recipe,
    }, fixture.value)
    expect(peak).toBe(1)
    expect(retained).toBe(0)
    expect(fixture.value.releaseSizeArtifacts).toHaveBeenCalledTimes(38)
  })

  it('produces byte-identical ZIPs for identical inputs', async () => {
    const request = { source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.ttf', slug: 'fixture', fontType: 'time_font' as const, recipe }
    const first = await buildBitmapFontPackage(request, adapters().value)
    const second = await buildBitmapFontPackage({ ...request, source: request.source.slice(0) }, adapters().value)
    expect(new Uint8Array(first.zip)).toEqual(new Uint8Array(second.zip))
    const archive = await JSZip.loadAsync(first.zip)
    const pngEntry = archive.file('6/fixture-g_0.png') as unknown as { _data: { compression: { magic: string } } }
    expect(pngEntry._data.compression.magic).toBe('\x00\x00')
    expect(archive.file('6/fixture-g_0.png')?.date.getUTCFullYear()).toBe(1980)
  })

  it('cancels immediately after an awaited PNG encode without progress', async () => {
    let cancelled = false
    let release!: () => void
    const fixture = adapters({ encodePng: () => new Promise((resolve) => { release = () => resolve(png.slice()) }) })
    const progress = vi.fn()
    const build = buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.ttf', slug: 'fixture', fontType: 'time_font', recipe,
    }, fixture.value, progress, () => cancelled)
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))
    cancelled = true
    release()
    await expect(build).rejects.toMatchObject({ code: 'BUILD_CANCELLED' })
    expect(progress).not.toHaveBeenCalled()
    expect(fixture.dispose).toHaveBeenCalledOnce()
  })

  it('cancels immediately after an awaited size-entry hash/add', async () => {
    let cancelled = false
    let hashes = 0
    const fixture = adapters({
      hash: async (value) => {
        hashes += 1
        const result = await sha256Hex(value)
        if (hashes === 3) cancelled = true
        return result
      },
    })
    const progress = vi.fn()
    await expect(buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.ttf', slug: 'fixture', fontType: 'time_font', recipe,
    }, fixture.value, progress, () => cancelled)).rejects.toMatchObject({ code: 'BUILD_CANCELLED' })
    expect(hashes).toBe(3)
    expect(progress).not.toHaveBeenCalled()
    expect(fixture.dispose).toHaveBeenCalledOnce()
  })

  it('cancels after the last size progress and before manifest completion', async () => {
    let cancelled = false
    const fixture = adapters()
    const progress = vi.fn((event: { completed: number }) => { if (event.completed === 38) cancelled = true })
    await expect(buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.ttf', slug: 'fixture', fontType: 'time_font', recipe,
    }, fixture.value, progress, () => cancelled)).rejects.toMatchObject({ code: 'BUILD_CANCELLED' })
    expect(progress).toHaveBeenCalledTimes(38)
    expect(fixture.dispose).toHaveBeenCalledOnce()
  })

  it('cancels immediately after ZIP generation resolves', async () => {
    let cancelled = false
    const fixture = adapters({ generateZip: async () => { cancelled = true; return new ArrayBuffer(4) } })
    await expect(buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.ttf', slug: 'fixture', fontType: 'time_font', recipe,
    }, fixture.value, undefined, () => cancelled)).rejects.toMatchObject({ code: 'BUILD_CANCELLED' })
    expect(fixture.dispose).toHaveBeenCalledOnce()
  })
})

describe('encodePngWithOffscreenCanvas', () => {
  it('writes RGBA pixels at the requested dimensions and converts to PNG', async () => {
    const putImageData = vi.fn()
    const createImageData = vi.fn((width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }))
    const convertToBlob = vi.fn(async (options: { type: string }) => {
      expect(options).toEqual({ type: 'image/png' })
      return new Blob([png], { type: 'image/png' })
    })
    const canvas = { getContext: vi.fn(() => ({ createImageData, putImageData })), convertToBlob }
    const Canvas = vi.fn(() => canvas)
    const result = await encodePngWithOffscreenCanvas(
      { width: 2, height: 1, rgba: new Uint8ClampedArray([255, 255, 255, 1, 255, 255, 255, 2]) },
      { OffscreenCanvas: Canvas },
    )
    expect(Canvas).toHaveBeenCalledWith(2, 1)
    expect(createImageData).toHaveBeenCalledWith(2, 1)
    expect(putImageData).toHaveBeenCalledOnce()
    expect(putImageData.mock.calls[0][0].data).toEqual(new Uint8ClampedArray([255, 255, 255, 1, 255, 255, 255, 2]))
    expect(result).toEqual(png)
  })

  it('returns a stable unsupported error when canvas APIs are missing', async () => {
    await expect(encodePngWithOffscreenCanvas(
      { width: 1, height: 1, rgba: new Uint8ClampedArray(4) },
      {},
    )).rejects.toMatchObject({ code: 'BROWSER_UNSUPPORTED' })
  })
})

describe('canonicalJson', () => {
  it('sorts object keys recursively without reordering arrays', () => {
    expect(canonicalJson({ z: [{ b: 1, a: 2 }], a: 1 })).toBe('{"a":1,"z":[{"a":2,"b":1}]}')
  })

  it.each([undefined, () => undefined, Symbol('x'), 1n, Number.NaN, Number.POSITIVE_INFINITY])('rejects unsupported JSON value %s', (value) => {
    expect(() => canonicalJson({ value })).toThrowError(expect.objectContaining({ code: 'PACKAGE_INVALID_JSON' }))
  })

  it('rejects cyclic objects', () => {
    const value: Record<string, unknown> = {}
    value.self = value
    expect(() => canonicalJson(value)).toThrowError(expect.objectContaining({ code: 'PACKAGE_INVALID_JSON' }))
  })
})

describe('builder validation', () => {
  it('normalizes the runtime recipe before hashing and rendering', async () => {
    const fixture = adapters()
    const dirtyRecipe = { ...recipe, fontWeight: 2000, italicAngle: 99, lineJoin: undefined } as unknown as BitmapFontRecipe
    const result = await buildBitmapFontPackage({ source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.ttf', slug: 'fixture', fontType: 'time_font', recipe: dirtyRecipe }, fixture.value)
    expect(fixture.value.createRendererSession).toHaveBeenCalledOnce()
    const archive = await JSZip.loadAsync(result.zip)
    expect(JSON.parse(await archive.file('recipe.json')!.async('string'))).toMatchObject({ fontWeight: 900, italicAngle: 20, lineJoin: 'round' })
  })

  it('rejects PNG encoder output without a valid PNG signature', async () => {
    const fixture = adapters({ encodePng: async () => new Uint8Array([1, 2, 3]) })
    await expect(buildBitmapFontPackage({ source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.ttf', slug: 'fixture', fontType: 'time_font', recipe }, fixture.value)).rejects.toMatchObject({ code: 'PNG_INVALID' })
    expect(fixture.dispose).toHaveBeenCalledOnce()
  })
})
