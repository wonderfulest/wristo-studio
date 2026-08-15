import JSZip from 'jszip'
import { packGlyphAtlas, type PackedGlyphAtlas } from './atlasPacker'
import { bmFontDescriptorFilename, writeBmFontText } from './bmFontWriter'
import {
  BITMAP_FONT_SIZES,
  charsetForType,
  type BitmapFontManifest,
  type BitmapFontRecipe,
  type BitmapFontType,
} from './contracts'
import { parseFontSource, type ParsedFontSource } from './fontSource'
import {
  createGlyphRendererSession,
  type GlyphRendererSession,
  type RenderedGlyph,
  type RenderedGlyphSet,
} from './glyphRenderer'

export interface BitmapFontBuildRequest {
  source: ArrayBuffer
  fileName: string
  slug: string
  fontType: BitmapFontType
  recipe: BitmapFontRecipe
}

export interface BitmapFontBuildProgress {
  completed: number
  size: number
  total: 38
}

export interface BitmapFontBuildResult {
  zip: ArrayBuffer
  manifest: BitmapFontManifest
}

interface AtlasPixels {
  width: number
  height: number
  rgba: Uint8ClampedArray
}

export interface PackageBuilderAdapters {
  parseSource(source: ArrayBuffer, fileName: string): Promise<ParsedFontSource>
  createRendererSession(source: ParsedFontSource): Promise<GlyphRendererSession>
  encodePng(atlas: AtlasPixels): Promise<Uint8Array>
  releaseSizeArtifacts?(): void
}

export class BuildCancelledError extends Error {
  readonly code = 'BUILD_CANCELLED' as const
  constructor() {
    super('BUILD_CANCELLED')
    this.name = 'BuildCancelledError'
  }
}

export class PackageBuildError extends Error {
  constructor(readonly code: 'UNSAFE_SOURCE_FILENAME' | 'BROWSER_UNSUPPORTED', message = code) {
    super(message)
    this.name = 'PackageBuildError'
  }
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, child]) => [key, stable(child)]),
    )
  }
  return value
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(stable(value))
}

export async function sha256Hex(value: ArrayBuffer | Uint8Array<ArrayBufferLike>): Promise<string> {
  const owned = value instanceof ArrayBuffer ? value : Uint8Array.from(value).buffer
  const digest = await crypto.subtle.digest('SHA-256', owned)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function sourceExtension(fileName: string): 'ttf' | 'otf' {
  if (fileName !== fileName.split(/[\\/]/).pop() || /[\u0000-\u001f\u007f]/.test(fileName)) {
    throw new PackageBuildError('UNSAFE_SOURCE_FILENAME')
  }
  const match = /\.([^.]+)$/.exec(fileName)
  const extension = match?.[1].toLowerCase()
  if (extension !== 'ttf' && extension !== 'otf') throw new PackageBuildError('UNSAFE_SOURCE_FILENAME')
  return extension
}

function composeAtlas(rendered: RenderedGlyphSet, packed: PackedGlyphAtlas): AtlasPixels {
  const rgba = new Uint8ClampedArray(packed.width * packed.height * 4)
  const glyphs = new Map<number, RenderedGlyph>(rendered.glyphs.map((glyph) => [glyph.codepoint, glyph]))
  for (const placement of packed.placements) {
    const glyph = glyphs.get(placement.codepoint)
    if (!glyph) continue
    for (let y = 0; y < glyph.height; y += 1) {
      for (let x = 0; x < glyph.width; x += 1) {
        const alpha = glyph.alpha[y * glyph.width + x]
        const offset = ((placement.y + y) * packed.width + placement.x + x) * 4
        rgba[offset] = 255
        rgba[offset + 1] = 255
        rgba[offset + 2] = 255
        rgba[offset + 3] = alpha
      }
    }
  }
  return { width: packed.width, height: packed.height, rgba }
}

async function defaultParseSource(source: ArrayBuffer, fileName: string): Promise<ParsedFontSource> {
  return parseFontSource(new File([source], fileName))
}

async function encodePngWithOffscreenCanvas(atlas: AtlasPixels): Promise<Uint8Array> {
  if (typeof OffscreenCanvas === 'undefined') throw new PackageBuildError('BROWSER_UNSUPPORTED')
  const canvas = new OffscreenCanvas(atlas.width, atlas.height)
  const context = canvas.getContext('2d')
  if (!context) throw new PackageBuildError('BROWSER_UNSUPPORTED')
  const pixels = context.createImageData(atlas.width, atlas.height)
  pixels.data.set(atlas.rgba)
  context.putImageData(pixels, 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new Uint8Array(await blob.arrayBuffer())
}

const defaultAdapters: PackageBuilderAdapters = {
  parseSource: defaultParseSource,
  createRendererSession: createGlyphRendererSession,
  encodePng: encodePngWithOffscreenCanvas,
}

function assertNotCancelled(isCancelled: () => boolean): void {
  if (isCancelled()) throw new BuildCancelledError()
}

export async function buildBitmapFontPackage(
  request: BitmapFontBuildRequest,
  adapters: PackageBuilderAdapters = defaultAdapters,
  onProgress: (progress: BitmapFontBuildProgress) => void = () => undefined,
  isCancelled: () => boolean = () => false,
): Promise<BitmapFontBuildResult> {
  const extension = sourceExtension(request.fileName)
  const descriptorName = bmFontDescriptorFilename(request.slug)
  const sourceName = `${request.slug}.${extension}`
  const sourceBytes = new Uint8Array(request.source)
  const source = await adapters.parseSource(request.source.slice(0), request.fileName)
  const charset = charsetForType(request.fontType)
  const recipeText = canonicalJson(request.recipe)
  const recipeBytes = new TextEncoder().encode(recipeText)
  const archive = new JSZip()
  const contentHashes = new Map<string, string>()

  async function add(path: string, bytes: Uint8Array | string): Promise<void> {
    const material = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes
    archive.file(path, material)
    contentHashes.set(path, await sha256Hex(material))
  }

  await add(sourceName, sourceBytes)
  await add('recipe.json', recipeBytes)
  const session = await adapters.createRendererSession(source)
  try {
    for (let index = 0; index < BITMAP_FONT_SIZES.length; index += 1) {
      assertNotCancelled(isCancelled)
      const size = BITMAP_FONT_SIZES[index]
      let rendered: RenderedGlyphSet | undefined
      let packed: PackedGlyphAtlas | undefined
      let atlas: AtlasPixels | undefined
      let png: Uint8Array | undefined
      try {
        rendered = session.render(size, request.recipe, charset.codepoints)
        packed = packGlyphAtlas(rendered.glyphs, { padding: 0 })
        atlas = composeAtlas(rendered, packed)
        png = await adapters.encodePng(atlas)
        assertNotCancelled(isCancelled)
        const prefix = `${size}/`
        await add(`${prefix}${request.slug}-g_0.png`, png)
        const placements = new Map(packed.placements.map((placement) => [placement.codepoint, placement]))
        const descriptor = writeBmFontText({
          slug: request.slug,
          face: source.family,
          size,
          lineHeight: rendered.lineHeight,
          base: rendered.baseline,
          scaleW: packed.width,
          scaleH: packed.height,
          chars: rendered.glyphs.map((glyph) => {
            const placement = placements.get(glyph.codepoint)
            if (!placement) throw new Error(`Missing atlas placement for U+${glyph.codepoint.toString(16)}`)
            return { id: glyph.codepoint, x: placement.x, y: placement.y, width: glyph.width, height: glyph.height, xoffset: glyph.xoffset, yoffset: glyph.yoffset, xadvance: glyph.xadvance }
          }),
        })
        await add(`${prefix}${descriptorName}`, descriptor)
      } finally {
        rendered = undefined
        packed = undefined
        atlas = undefined
        png = undefined
        adapters.releaseSizeArtifacts?.()
      }
      assertNotCancelled(isCancelled)
      onProgress({ completed: index + 1, size, total: 38 })
    }
  } finally {
    session.dispose()
  }

  const contentMaterial = [...contentHashes]
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([path, hash]) => `${path}\0${hash.toLowerCase()}\n`)
    .join('')
  const manifest: BitmapFontManifest = {
    schemaVersion: 1,
    slug: request.slug,
    type: request.fontType,
    language: 'en',
    source: { fileName: sourceName, sha256: await sha256Hex(sourceBytes) },
    sizes: [...BITMAP_FONT_SIZES],
    charset,
    recipeSha256: await sha256Hex(recipeBytes),
    packageContentSha256: await sha256Hex(new TextEncoder().encode(contentMaterial)),
  }
  archive.file('manifest.json', canonicalJson(manifest))
  const zip = await archive.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
  return { zip, manifest }
}
