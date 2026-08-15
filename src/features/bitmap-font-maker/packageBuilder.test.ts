import JSZip from 'jszip'
import { describe, expect, it, vi } from 'vitest'
import { BITMAP_FONT_SIZES, type BitmapFontRecipe } from './contracts'
import type { ParsedFontSource } from './fontSource'
import type { GlyphRendererSession, RenderedGlyphSet } from './glyphRenderer'
import {
  BuildCancelledError,
  buildBitmapFontPackage,
  canonicalJson,
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

function adapters(options?: { onRender?: (size: number) => void; onRelease?: () => void }) {
  const dispose = vi.fn()
  const session: GlyphRendererSession = {
    rendererPath: 'opentype-path',
    render(size) {
      options?.onRender?.(size)
      return rendered(size)
    },
    dispose,
  }
  return {
    dispose,
    value: {
      parseSource: vi.fn(async () => parsedSource),
      createRendererSession: vi.fn(async () => session),
      encodePng: vi.fn(async () => png.slice()),
      releaseSizeArtifacts: vi.fn(options?.onRelease ?? (() => undefined)),
    },
  }
}

describe('buildBitmapFontPackage', () => {
  it('builds the canonical 38-size package with 79 root-relative entries and valid descriptors', async () => {
    const fixture = adapters()
    const progress: unknown[] = []
    const result = await buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer,
      fileName: 'Fixture.TTF',
      slug: 'fixture-outline',
      fontType: 'number_font',
      recipe,
    }, fixture.value, (event) => progress.push(event))

    const archive = await JSZip.loadAsync(result.zip)
    const paths = Object.keys(archive.files).filter((path) => !archive.files[path].dir).sort()
    expect(paths).toHaveLength(79)
    expect(paths).toContain('fixture-outline.ttf')
    expect(paths).toContain('recipe.json')
    expect(paths).toContain('manifest.json')
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

  it('writes stable hashes and a complete manifest while excluding manifest.json from content hash', async () => {
    const fixture = adapters()
    const result = await buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.otf', slug: 'fixture', fontType: 'number_font', recipe,
    }, fixture.value)
    const archive = await JSZip.loadAsync(result.zip)
    const manifest = JSON.parse(await archive.file('manifest.json')!.async('string'))
    const recipeBytes = new TextEncoder().encode(await archive.file('recipe.json')!.async('string'))
    expect(manifest).toEqual(result.manifest)
    expect(manifest.sizes).toEqual([...BITMAP_FONT_SIZES])
    expect(manifest.charset.profile).toBe('wristo-number-v1')
    expect(manifest.source).toEqual({ fileName: 'fixture.otf', sha256: await sha256Hex(parsedSource.bytes) })
    expect(manifest.recipeSha256).toBe(await sha256Hex(recipeBytes))

    const materials: string[] = []
    for (const path of Object.keys(archive.files).filter((path) => !archive.files[path].dir && path !== 'manifest.json').sort()) {
      materials.push(`${path}\0${await sha256Hex(new Uint8Array(await archive.file(path)!.async('arraybuffer')))}\n`)
    }
    expect(manifest.packageContentSha256).toBe(await sha256Hex(new TextEncoder().encode(materials.join(''))))
    expect(await archive.file('manifest.json')!.async('string')).toBe(canonicalJson(manifest))
  })

  it('rejects unsafe names and always disposes the renderer on cancellation', async () => {
    let cancelled = false
    const fixture = adapters({ onRender: () => { cancelled = true } })
    await expect(buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: '../Fixture.ttf', slug: 'fixture', fontType: 'number_font', recipe,
    }, fixture.value)).rejects.toMatchObject({ code: 'UNSAFE_SOURCE_FILENAME' })
    await expect(buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.ttf', slug: '../fixture', fontType: 'number_font', recipe,
    }, fixture.value)).rejects.toThrow('Bitmap font slug')

    const progress = vi.fn()
    await expect(buildBitmapFontPackage({
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.ttf', slug: 'fixture', fontType: 'number_font', recipe,
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
      source: Uint8Array.from(parsedSource.bytes).buffer, fileName: 'Fixture.ttf', slug: 'fixture', fontType: 'number_font', recipe,
    }, fixture.value)
    expect(peak).toBe(1)
    expect(retained).toBe(0)
    expect(fixture.value.releaseSizeArtifacts).toHaveBeenCalledTimes(38)
  })
})

describe('canonicalJson', () => {
  it('sorts object keys recursively without reordering arrays', () => {
    expect(canonicalJson({ z: [{ b: 1, a: 2 }], a: 1 })).toBe('{"a":1,"z":[{"a":2,"b":1}]}')
  })
})
