import JSZip from 'jszip'
import { BITMAP_FONT_SIZES, type BitmapFontCharset, type BitmapFontManifest, type BitmapFontRecipe, type BitmapFontType } from '@/features/bitmap-font-maker/contracts'
import { canonicalJson, sha256Hex } from '@/features/bitmap-font-maker/packageBuilder'

export class LocalPackageValidationError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'LocalPackageValidationError' }
}

export interface LocalPackageValidationExpected {
  slug: string
  fontType: BitmapFontType
  sourceFileName: string
  recipe: BitmapFontRecipe
  charset: BitmapFontCharset
}

const fail = (code: string): never => { throw new LocalPackageValidationError(code) }
const bytesEqual = (left: Uint8Array, right: Uint8Array) => left.length === right.length && left.every((value, index) => value === right[index])
const utf8Compare = (left: string, right: string) => {
  const a = new TextEncoder().encode(left)
  const b = new TextEncoder().encode(right)
  const limit = Math.min(a.length, b.length)
  for (let index = 0; index < limit; index += 1) if (a[index] !== b[index]) return a[index] - b[index]
  return a.length - b.length
}

function fields(line: string): Record<string, string> {
  return Object.fromEntries([...line.matchAll(/\b([a-zA-Z][a-zA-Z0-9]*)=("(?:[^"\\]|\\.)*"|[^\s]+)/g)].map(match => [match[1], match[2].replace(/^"|"$/g, '')]))
}

function integer(value: string | undefined, code: string, minimum = Number.MIN_SAFE_INTEGER): number {
  if (value === undefined || !/^-?\d+$/.test(value)) fail(code)
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < minimum) fail(code)
  return parsed
}

function parseDescriptor(text: string, expectedPage: string, codepoints: number[], pngWidth: number, pngHeight: number) {
  const infos = text.match(/^info\s+.*$/gm) ?? []
  const commons = text.match(/^common\s+.*$/gm) ?? []
  if (infos.length !== 1 || commons.length !== 1) fail('FNT_HEADER_INVALID')
  const common = fields(commons[0]!)
  if (integer(common.pages, 'FNT_PAGES_INVALID', 1) !== 1) fail('FNT_PAGES_INVALID')
  if (integer(common.scaleW, 'FNT_SCALE_INVALID', 1) !== pngWidth || integer(common.scaleH, 'FNT_SCALE_INVALID', 1) !== pngHeight) fail('FNT_SCALE_MISMATCH')
  const pages = [...text.matchAll(/^page\s+id=(\d+)\s+file="([^"]+)"\s*$/gm)]
  if (pages.length !== 1 || pages[0][1] !== '0' || pages[0][2] !== expectedPage) fail('FNT_PAGE_INVALID')
  const countLines = [...text.matchAll(/^chars\s+count=(\d+)\s*$/gm)]
  const charLines = text.match(/^char\s+.*$/gm) ?? []
  if (countLines.length !== 1 || Number(countLines[0][1]) !== charLines.length) fail('FNT_CHAR_COUNT_INVALID')
  const ids = new Set<number>()
  for (const line of charLines) {
    const char = fields(line)
    const id = integer(char.id, 'FNT_CHAR_INVALID', 0)
    if (id > 0x10ffff || (id >= 0xd800 && id <= 0xdfff) || ids.has(id)) fail('FNT_CHAR_INVALID')
    ids.add(id)
    const x = integer(char.x, 'FNT_CHAR_RECT_INVALID', 0)
    const y = integer(char.y, 'FNT_CHAR_RECT_INVALID', 0)
    const width = integer(char.width, 'FNT_CHAR_RECT_INVALID', 0)
    const height = integer(char.height, 'FNT_CHAR_RECT_INVALID', 0)
    if (x + width > pngWidth || y + height > pngHeight) fail('FNT_CHAR_BOUNDS_INVALID')
    integer(char.xadvance, 'FNT_CHAR_ADVANCE_INVALID', 0)
    integer(char.xoffset, 'FNT_CHAR_OFFSET_INVALID')
    integer(char.yoffset, 'FNT_CHAR_OFFSET_INVALID')
    if (integer(char.page, 'FNT_CHAR_PAGE_INVALID', 0) !== 0) fail('FNT_CHAR_PAGE_INVALID')
  }
  if (ids.size !== codepoints.length || codepoints.some(codepoint => !ids.has(codepoint))) fail('FNT_CHARSET_INVALID')
}

function parsePng(bytes: Uint8Array): { width: number; height: number } {
  const signature = new Uint8Array([137,80,78,71,13,10,26,10])
  const iend = new Uint8Array([0,0,0,0,73,69,78,68,174,66,96,130])
  if (bytes.length < signature.length || !bytesEqual(bytes.slice(0, 8), signature)) fail('PNG_INVALID')
  if (bytes.length < 33) fail('PNG_IHDR_INVALID')
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    if (view.getUint32(8) !== 13 || new TextDecoder().decode(bytes.slice(12, 16)) !== 'IHDR') fail('PNG_IHDR_INVALID')
    const width = view.getUint32(16)
    const height = view.getUint32(20)
    if (width < 1 || height < 1 || width > 8192 || height > 8192) fail('PNG_DIMENSIONS_INVALID')
    if (!bytesEqual(bytes.slice(-12), iend)) fail('PNG_INVALID')
    return { width, height }
  } catch (error) {
    if (error instanceof LocalPackageValidationError) throw error
    return fail('PNG_IHDR_INVALID')
  }
}

function parseManifest(text: string): BitmapFontManifest {
  try { return JSON.parse(text) as BitmapFontManifest } catch { return fail('MANIFEST_INVALID') }
}

export async function validateLocalBitmapPackage(
  artifact: { zip: ArrayBuffer; manifest: BitmapFontManifest },
  expected: LocalPackageValidationExpected,
): Promise<void> {
  let archive: JSZip
  try { archive = await JSZip.loadAsync(artifact.zip) } catch { fail('ZIP_INVALID') }
  const entries = Object.entries(archive!.files)
  if (entries.some(([, entry]) => entry.dir)) fail('PACKAGE_DIRECTORY_ENTRY')
  if (entries.length !== 79) fail('PACKAGE_ENTRY_COUNT')

  const extension = /\.otf$/i.test(expected.sourceFileName) ? 'otf' : /\.ttf$/i.test(expected.sourceFileName) ? 'ttf' : fail('SOURCE_EXTENSION_INVALID')
  const sourcePath = `${expected.slug}.${extension}`
  const allowed = new Set(['manifest.json', 'recipe.json', sourcePath])
  for (const size of BITMAP_FONT_SIZES) {
    allowed.add(`${size}/${expected.slug}-g.fnt`)
    allowed.add(`${size}/${expected.slug}-g_0.png`)
  }
  if (entries.some(([path]) => !allowed.has(path)) || allowed.size !== entries.length) fail('PACKAGE_PATH_INVALID')

  const manifestEntry = archive!.file('manifest.json') ?? fail('MANIFEST_MISSING')
  const recipeEntry = archive!.file('recipe.json') ?? fail('RECIPE_MISSING')
  const sourceEntry = archive!.file(sourcePath) ?? fail('SOURCE_MISSING')
  const manifest = parseManifest(new TextDecoder().decode(await manifestEntry.async('uint8array')))
  if (canonicalJson(manifest) !== canonicalJson(artifact.manifest)) fail('MANIFEST_ARTIFACT_MISMATCH')
  if (manifest.schemaVersion !== 1) fail('MANIFEST_SCHEMA_INVALID')
  const expectedLanguage = expected.fontType === 'text_font_zh' ? 'zh' : 'en'
  if (manifest.slug !== expected.slug || manifest.type !== expected.fontType || manifest.language !== expectedLanguage) fail('MANIFEST_METADATA_MISMATCH')
  if (manifest.source.fileName !== sourcePath) fail('MANIFEST_SOURCE_MISMATCH')
  if (canonicalJson(manifest.sizes) !== canonicalJson([...BITMAP_FONT_SIZES])) fail('MANIFEST_SIZES_MISMATCH')
  if (canonicalJson(manifest.charset) !== canonicalJson(expected.charset)) fail('MANIFEST_CHARSET_MISMATCH')

  const hashes: Array<[string, string]> = []
  let recipeBytes: Uint8Array | undefined = await recipeEntry.async('uint8array')
  if (new TextDecoder().decode(recipeBytes) !== canonicalJson(expected.recipe)) fail('RECIPE_CONTENT_MISMATCH')
  const recipeHash = await sha256Hex(recipeBytes)
  if (recipeHash !== manifest.recipeSha256) fail('RECIPE_HASH_MISMATCH')
  hashes.push(['recipe.json', recipeHash])
  recipeBytes = undefined
  let sourceBytes: Uint8Array | undefined = await sourceEntry.async('uint8array')
  const sourceHash = await sha256Hex(sourceBytes)
  if (sourceHash !== manifest.source.sha256) fail('SOURCE_HASH_MISMATCH')
  hashes.push([sourcePath, sourceHash])
  sourceBytes = undefined

  for (const size of BITMAP_FONT_SIZES) {
    const image = archive!.file(`${size}/${expected.slug}-g_0.png`) ?? fail('PNG_MISSING')
    const imagePath = `${size}/${expected.slug}-g_0.png`
    let imageBytes: Uint8Array | undefined = await image.async('uint8array')
    const dimensions = parsePng(imageBytes)
    hashes.push([imagePath, await sha256Hex(imageBytes)])
    imageBytes = undefined
    const descriptor = archive!.file(`${size}/${expected.slug}-g.fnt`) ?? fail('FNT_MISSING')
    const descriptorPath = `${size}/${expected.slug}-g.fnt`
    let descriptorBytes: Uint8Array | undefined = await descriptor.async('uint8array')
    parseDescriptor(new TextDecoder().decode(descriptorBytes), `${expected.slug}-g_0.png`, expected.charset.codepoints, dimensions.width, dimensions.height)
    hashes.push([descriptorPath, await sha256Hex(descriptorBytes)])
    descriptorBytes = undefined
  }

  const material = hashes.sort(([a], [b]) => utf8Compare(a, b)).map(([path, hash]) => `${path}\0${hash.toLowerCase()}\n`).join('')
  if (await sha256Hex(new TextEncoder().encode(material)) !== manifest.packageContentSha256) fail('PACKAGE_HASH_MISMATCH')
}
