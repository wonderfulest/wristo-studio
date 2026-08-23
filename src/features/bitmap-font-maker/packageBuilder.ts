import JSZip from 'jszip'
import { packGlyphAtlas, type PackedGlyphAtlas } from './atlasPacker'
import { bmFontDescriptorFilename, writeBmFontText } from './bmFontWriter'
import {
  BITMAP_FONT_SIZES,
  charsetForType,
  normalizeBitmapFontRecipe,
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
import { canonicalJson, sha256Hex } from './deterministicEncoding'

export { canonicalJson, sha256Hex } from './deterministicEncoding'

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

export interface AtlasPixels {
  width: number
  height: number
  rgba: Uint8ClampedArray
}

export interface PackageBuilderAdapters {
  parseSource(source: ArrayBuffer, fileName: string): Promise<ParsedFontSource>
  createRendererSession(source: ParsedFontSource): Promise<GlyphRendererSession>
  encodePng(atlas: AtlasPixels): Promise<Uint8Array>
  hash?(value: ArrayBuffer | Uint8Array<ArrayBufferLike>): Promise<string>
  generateZip?(archive: JSZip): Promise<ArrayBuffer>
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
  constructor(readonly code: 'UNSAFE_SOURCE_FILENAME' | 'BROWSER_UNSUPPORTED' | 'PACKAGE_INVALID_JSON' | 'PNG_INVALID', message = code) {
    super(message)
    this.name = 'PackageBuildError'
  }
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

interface PngCanvasEnvironment {
  OffscreenCanvas?: new (width: number, height: number) => {
    getContext(type: '2d'): {
      createImageData(width: number, height: number): { data: Uint8ClampedArray }
      putImageData(image: { data: Uint8ClampedArray }, x: number, y: number): void
    } | null
    convertToBlob(options: { type: 'image/png' }): Promise<Blob>
  }
}

export async function encodePngWithOffscreenCanvas(
  atlas: AtlasPixels,
  environment: PngCanvasEnvironment = globalThis as unknown as PngCanvasEnvironment,
): Promise<Uint8Array> {
  if (!environment.OffscreenCanvas) throw new PackageBuildError('BROWSER_UNSUPPORTED')
  const canvas = new environment.OffscreenCanvas(atlas.width, atlas.height)
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

const ZIP_ENTRY_DATE = new Date(Date.UTC(1980, 0, 1))
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

function assertPng(bytes: Uint8Array): void {
  if (bytes.length < PNG_SIGNATURE.length || PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)) {
    throw new PackageBuildError('PNG_INVALID')
  }
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
  assertNotCancelled(isCancelled)
  const extension = sourceExtension(request.fileName)
  const descriptorName = bmFontDescriptorFilename(request.slug)
  const sourceName = `${request.slug}.${extension}`
  const sourceBytes = new Uint8Array(request.source)
  assertNotCancelled(isCancelled)
  const source = await adapters.parseSource(request.source.slice(0), request.fileName)
  assertNotCancelled(isCancelled)
  const charset = charsetForType(request.fontType)
  assertNotCancelled(isCancelled)
  const normalizedRecipe = normalizeBitmapFontRecipe(request.recipe)
  const recipeText = canonicalJson(normalizedRecipe)
  assertNotCancelled(isCancelled)
  const recipeBytes = new TextEncoder().encode(recipeText)
  const archive = new JSZip()
  const contentHashes = new Map<string, string>()
  const hash = adapters.hash ?? sha256Hex
  const generateZip = adapters.generateZip ?? ((zip: JSZip) => zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' }))

  async function add(path: string, bytes: Uint8Array | string): Promise<void> {
    assertNotCancelled(isCancelled)
    const material = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes
    archive.file(path, material, {
      date: ZIP_ENTRY_DATE,
      createFolders: false,
      compression: path.endsWith('.png') ? 'STORE' : 'DEFLATE',
    })
    assertNotCancelled(isCancelled)
    const digest = await hash(material)
    assertNotCancelled(isCancelled)
    contentHashes.set(path, digest)
    assertNotCancelled(isCancelled)
  }

  assertNotCancelled(isCancelled)
  await add(sourceName, sourceBytes)
  assertNotCancelled(isCancelled)
  await add('recipe.json', recipeBytes)
  assertNotCancelled(isCancelled)
  const session = await adapters.createRendererSession(source)
  try {
    assertNotCancelled(isCancelled)
    for (let index = 0; index < BITMAP_FONT_SIZES.length; index += 1) {
      assertNotCancelled(isCancelled)
      const size = BITMAP_FONT_SIZES[index]
      let rendered: RenderedGlyphSet | undefined
      let packed: PackedGlyphAtlas | undefined
      let atlas: AtlasPixels | undefined
      let png: Uint8Array | undefined
      try {
        assertNotCancelled(isCancelled)
        rendered = session.render(size, normalizedRecipe, charset.codepoints)
        assertNotCancelled(isCancelled)
        packed = packGlyphAtlas(rendered.glyphs, { padding: 0 })
        assertNotCancelled(isCancelled)
        atlas = composeAtlas(rendered, packed)
        assertNotCancelled(isCancelled)
        png = await adapters.encodePng(atlas)
        assertNotCancelled(isCancelled)
        assertPng(png)
        const prefix = `${size}/`
        await add(`${prefix}${request.slug}-g_0.png`, png)
        assertNotCancelled(isCancelled)
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
        assertNotCancelled(isCancelled)
        await add(`${prefix}${descriptorName}`, descriptor)
        assertNotCancelled(isCancelled)
      } finally {
        rendered = undefined
        packed = undefined
        atlas = undefined
        png = undefined
        adapters.releaseSizeArtifacts?.()
      }
      assertNotCancelled(isCancelled)
      onProgress({ completed: index + 1, size, total: 38 })
      assertNotCancelled(isCancelled)
    }
  } finally {
    session.dispose()
  }

  assertNotCancelled(isCancelled)
  const contentMaterial = [...contentHashes]
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([path, hash]) => `${path}\0${hash.toLowerCase()}\n`)
    .join('')
  assertNotCancelled(isCancelled)
  const sourceSha256 = await hash(sourceBytes)
  assertNotCancelled(isCancelled)
  const recipeSha256 = await hash(recipeBytes)
  assertNotCancelled(isCancelled)
  const packageContentSha256 = await hash(new TextEncoder().encode(contentMaterial))
  assertNotCancelled(isCancelled)
  const manifest: BitmapFontManifest = {
    schemaVersion: 1,
    slug: request.slug,
    type: request.fontType,
    language: request.fontType === 'text_font_zh' ? 'zh' : 'en',
    source: { fileName: sourceName, sha256: sourceSha256 },
    sizes: [...BITMAP_FONT_SIZES],
    charset,
    recipeSha256,
    packageContentSha256,
  }
  assertNotCancelled(isCancelled)
  const manifestText = canonicalJson(manifest)
  assertNotCancelled(isCancelled)
  archive.file('manifest.json', manifestText, { date: ZIP_ENTRY_DATE, createFolders: false, compression: 'DEFLATE' })
  assertNotCancelled(isCancelled)
  const zip = await generateZip(archive)
  assertNotCancelled(isCancelled)
  assertNotCancelled(isCancelled)
  return { zip, manifest }
}
