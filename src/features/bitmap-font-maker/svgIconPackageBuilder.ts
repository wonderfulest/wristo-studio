import JSZip from 'jszip'
import { packGlyphAtlas } from './atlasPacker'
import { bmFontDescriptorFilename, writeBmFontText } from './bmFontWriter'
import { BITMAP_FONT_SIZES } from './contracts'
import { canonicalJson, encodePngWithOffscreenCanvas, sha256Hex, type AtlasPixels } from './packageBuilder'
import { validateWeatherSvgSource } from './weatherSourceSet'
import { rasterizeWeatherSvgSources } from './weatherSvgRasterizer'

export type SvgIconFontType = 'icon_font' | 'weather_font'
export type SvgIconCharsetProfile = 'wristo-icon-v1' | 'wristo-weather-v1'

export interface SvgIconFontSlot {
  iconUnicode: string
  codepoint: number
  symbolCode: string
  label: string
}

export interface SvgIconBitmapFontRecipe {
  schemaVersion: 1
  rendererVersion: '1'
  contentScale: number
  antialias: true
}

export interface SvgIconSource {
  iconUnicode: string
  fileName: string
  svg: string
  raster?: {
    width: number
    height: number
    alpha: Uint8ClampedArray
  }
}

export interface SvgIconRenderedGlyph {
  codepoint: number
  width: number
  height: number
  xoffset: number
  yoffset: number
  xadvance: number
  alpha: Uint8ClampedArray
}

export interface SvgIconRenderedGlyphSet {
  glyphs: SvgIconRenderedGlyph[]
  lineHeight: number
  baseline: number
}

export interface SvgIconBitmapFontManifest {
  schemaVersion: 1
  slug: string
  type: SvgIconFontType
  language: 'en'
  source: {
    files: Array<{ iconUnicode: string; fileName: string; sha256: string }>
  }
  sizes: number[]
  charset: { profile: SvgIconCharsetProfile; codepoints: number[] }
  recipeSha256: string
  packageContentSha256: string
}

export interface SvgIconBitmapFontBuildRequest {
  slug: string
  type: SvgIconFontType
  charsetProfile: SvgIconCharsetProfile
  slots: readonly SvgIconFontSlot[]
  sources: SvgIconSource[]
  recipe: SvgIconBitmapFontRecipe
}

export interface SvgIconBitmapFontBuildProgress {
  completed: number
  size: number
  total: 38
}

export interface SvgIconPackageBuilderAdapters {
  rasterize(sources: SvgIconSource[], size: number, recipe: SvgIconBitmapFontRecipe): Promise<SvgIconRenderedGlyphSet>
  encodePng(atlas: AtlasPixels): Promise<Uint8Array>
  hash(value: ArrayBuffer | Uint8Array<ArrayBufferLike>): Promise<string>
  generateZip?(archive: JSZip): Promise<ArrayBuffer>
}

export interface SvgIconBitmapFontBuildResult {
  zip: ArrayBuffer
  manifest: SvgIconBitmapFontManifest
}

const ZIP_ENTRY_DATE = new Date(Date.UTC(1980, 0, 1))
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

function normalizeRecipe(recipe: SvgIconBitmapFontRecipe): SvgIconBitmapFontRecipe {
  if (recipe.schemaVersion !== 1 || recipe.rendererVersion !== '1' || recipe.antialias !== true) {
    throw new Error('SVG_ICON_RECIPE_INVALID')
  }
  if (!Number.isFinite(recipe.contentScale) || recipe.contentScale < 0.5 || recipe.contentScale > 1) {
    throw new Error('SVG_ICON_RECIPE_INVALID')
  }
  return { ...recipe, contentScale: Math.round(recipe.contentScale * 1000) / 1000 }
}

function normalizeSlots(slots: readonly SvgIconFontSlot[]): SvgIconFontSlot[] {
  if (slots.length < 1 || slots.length > 512) throw new Error('SVG_ICON_SLOT_SET_INVALID')
  const codes = new Set<string>()
  const points = new Set<number>()
  return slots.map((slot) => {
    const iconUnicode = slot.iconUnicode.trim().toLowerCase()
    const codepoint = Number.parseInt(iconUnicode, 16)
    const symbolCode = slot.symbolCode.trim().toLowerCase()
    if (!/^[0-9a-f]{2,6}$/.test(iconUnicode) || codepoint !== slot.codepoint || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(symbolCode)) {
      throw new Error('SVG_ICON_SLOT_SET_INVALID')
    }
    if (codes.has(iconUnicode) || points.has(codepoint)) throw new Error('SVG_ICON_SLOT_SET_INVALID')
    codes.add(iconUnicode)
    points.add(codepoint)
    return { ...slot, iconUnicode, codepoint, symbolCode }
  })
}

function normalizeSources(sources: SvgIconSource[], slots: SvgIconFontSlot[]): SvgIconSource[] {
  const byCode = new Map<string, SvgIconSource>()
  for (const source of sources) {
    const code = source.iconUnicode.trim().toLowerCase()
    if (byCode.has(code)) throw new Error('SVG_ICON_SOURCE_SET_INCOMPLETE')
    byCode.set(code, source)
  }
  if (byCode.size !== slots.length) throw new Error('SVG_ICON_SOURCE_SET_INCOMPLETE')
  return slots.map((slot) => {
    const source = byCode.get(slot.iconUnicode)
    if (!source) throw new Error('SVG_ICON_SOURCE_SET_INCOMPLETE')
    validateWeatherSvgSource(source.svg)
    return {
      ...source,
      iconUnicode: slot.iconUnicode,
      fileName: `${slot.iconUnicode}-${slot.symbolCode}.svg`,
    }
  })
}

function composeAtlas(rendered: SvgIconRenderedGlyphSet, placements: ReturnType<typeof packGlyphAtlas>): AtlasPixels {
  const rgba = new Uint8ClampedArray(placements.width * placements.height * 4)
  const glyphs = new Map(rendered.glyphs.map((glyph) => [glyph.codepoint, glyph]))
  for (const placement of placements.placements) {
    const glyph = glyphs.get(placement.codepoint)
    if (!glyph) continue
    for (let y = 0; y < glyph.height; y += 1) {
      for (let x = 0; x < glyph.width; x += 1) {
        const alpha = glyph.alpha[y * glyph.width + x]
        const offset = ((placement.y + y) * placements.width + placement.x + x) * 4
        rgba[offset] = 255
        rgba[offset + 1] = 255
        rgba[offset + 2] = 255
        rgba[offset + 3] = alpha
      }
    }
  }
  return { width: placements.width, height: placements.height, rgba }
}

function assertPng(bytes: Uint8Array): void {
  if (bytes.length < PNG_SIGNATURE.length || PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)) {
    throw new Error('PNG_INVALID')
  }
}

const defaultAdapters: SvgIconPackageBuilderAdapters = {
  rasterize: rasterizeWeatherSvgSources,
  encodePng: encodePngWithOffscreenCanvas,
  hash: sha256Hex,
}

export async function buildSvgIconBitmapFontPackage(
  request: SvgIconBitmapFontBuildRequest,
  adapters: SvgIconPackageBuilderAdapters = defaultAdapters,
  onProgress: (progress: SvgIconBitmapFontBuildProgress) => void = () => undefined,
  isCancelled: () => boolean = () => false,
): Promise<SvgIconBitmapFontBuildResult> {
  const cancelled = () => {
    if (isCancelled()) throw new Error('BUILD_CANCELLED')
  }
  const slug = request.slug.trim()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('SVG_ICON_SLUG_INVALID')
  const expectedProfile = request.type === 'weather_font' ? 'wristo-weather-v1' : 'wristo-icon-v1'
  if (request.charsetProfile !== expectedProfile) throw new Error('SVG_ICON_PROFILE_INVALID')
  const recipe = normalizeRecipe(request.recipe)
  const slots = normalizeSlots(request.slots)
  const sources = normalizeSources(request.sources, slots)
  const codepoints = slots.map((slot) => slot.codepoint)
  const archive = new JSZip()
  const contentHashes = new Map<string, string>()
  const recipeText = canonicalJson(recipe)

  const add = async (path: string, value: string | Uint8Array) => {
    cancelled()
    const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
    archive.file(path, bytes, { date: ZIP_ENTRY_DATE, createFolders: false, compression: path.endsWith('.png') ? 'STORE' : 'DEFLATE' })
    contentHashes.set(path, await adapters.hash(bytes))
  }

  const sourceFiles: SvgIconBitmapFontManifest['source']['files'] = []
  for (const source of sources) {
    const path = `sources/${source.fileName}`
    const bytes = new TextEncoder().encode(source.svg)
    await add(path, bytes)
    sourceFiles.push({ iconUnicode: source.iconUnicode, fileName: source.fileName, sha256: await adapters.hash(bytes) })
  }
  await add('recipe.json', recipeText)

  for (let index = 0; index < BITMAP_FONT_SIZES.length; index += 1) {
    cancelled()
    const size = BITMAP_FONT_SIZES[index]
    const rendered = await adapters.rasterize(sources, size, recipe)
    const ids = rendered.glyphs.map((glyph) => glyph.codepoint)
    if (ids.length !== codepoints.length || ids.some((id, position) => id !== codepoints[position])) {
      throw new Error('SVG_ICON_RENDER_CHARSET_INVALID')
    }
    const packed = packGlyphAtlas(rendered.glyphs, { padding: 0, preferSquare: true })
    const atlas = composeAtlas(rendered, packed)
    const png = await adapters.encodePng(atlas)
    assertPng(png)
    await add(`${size}/${slug}-g_0.png`, png)
    const placementByCode = new Map(packed.placements.map((placement) => [placement.codepoint, placement]))
    const descriptor = writeBmFontText({
      slug,
      face: slug,
      size,
      lineHeight: rendered.lineHeight,
      base: rendered.baseline,
      scaleW: packed.width,
      scaleH: packed.height,
      chars: rendered.glyphs.map((glyph) => {
        const placement = placementByCode.get(glyph.codepoint)
        if (!placement) throw new Error('SVG_ICON_ATLAS_PLACEMENT_MISSING')
        return {
          id: glyph.codepoint,
          x: placement.x,
          y: placement.y,
          width: glyph.width,
          height: glyph.height,
          xoffset: glyph.xoffset,
          yoffset: glyph.yoffset,
          xadvance: glyph.xadvance,
        }
      }),
    })
    await add(`${size}/${bmFontDescriptorFilename(slug)}`, descriptor)
    onProgress({ completed: index + 1, size, total: 38 })
  }

  const recipeSha256 = await adapters.hash(new TextEncoder().encode(recipeText))
  const contentMaterial = [...contentHashes]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([path, hash]) => `${path}\0${hash.toLowerCase()}\n`)
    .join('')
  const manifest: SvgIconBitmapFontManifest = {
    schemaVersion: 1,
    slug,
    type: request.type,
    language: 'en',
    source: { files: sourceFiles },
    sizes: [...BITMAP_FONT_SIZES],
    charset: { profile: request.charsetProfile, codepoints },
    recipeSha256,
    packageContentSha256: await adapters.hash(new TextEncoder().encode(contentMaterial)),
  }
  archive.file('manifest.json', canonicalJson(manifest), { date: ZIP_ENTRY_DATE, createFolders: false, compression: 'DEFLATE' })
  const generateZip = adapters.generateZip ?? ((zip: JSZip) => zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' }))
  return { zip: await generateZip(archive), manifest }
}
