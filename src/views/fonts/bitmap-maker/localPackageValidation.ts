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

function parseDescriptor(text: string, expectedPage: string, codepoints: number[]) {
  const pages = [...text.matchAll(/^page\s+id=(\d+)\s+file="([^"]+)"\s*$/gm)]
  if (pages.length !== 1 || pages[0][1] !== '0' || pages[0][2] !== expectedPage) fail('FNT_PAGE_INVALID')
  const countLines = [...text.matchAll(/^chars\s+count=(\d+)\s*$/gm)]
  const chars = [...text.matchAll(/^char\s+id=(\d+)\b.*$/gm)].map(match => Number(match[1]))
  if (countLines.length !== 1 || Number(countLines[0][1]) !== chars.length) fail('FNT_CHAR_COUNT_INVALID')
  const unique = new Set(chars)
  if (unique.size !== chars.length || unique.size !== codepoints.length || codepoints.some(codepoint => !unique.has(codepoint))) fail('FNT_CHARSET_INVALID')
}

function assertPng(bytes: Uint8Array) {
  const signature = new Uint8Array([137,80,78,71,13,10,26,10])
  const iend = new Uint8Array([0,0,0,0,73,69,78,68,174,66,96,130])
  if (bytes.length < signature.length + iend.length || !bytesEqual(bytes.slice(0, 8), signature) || !bytesEqual(bytes.slice(-12), iend)) fail('PNG_INVALID')
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
  const manifest = parseManifest(await manifestEntry.async('string'))
  if (canonicalJson(manifest) !== canonicalJson(artifact.manifest)) fail('MANIFEST_ARTIFACT_MISMATCH')
  if (manifest.schemaVersion !== 1) fail('MANIFEST_SCHEMA_INVALID')
  if (manifest.slug !== expected.slug || manifest.type !== expected.fontType || manifest.language !== 'en') fail('MANIFEST_METADATA_MISMATCH')
  if (manifest.source.fileName !== sourcePath) fail('MANIFEST_SOURCE_MISMATCH')
  if (canonicalJson(manifest.sizes) !== canonicalJson([...BITMAP_FONT_SIZES])) fail('MANIFEST_SIZES_MISMATCH')
  if (canonicalJson(manifest.charset) !== canonicalJson(expected.charset)) fail('MANIFEST_CHARSET_MISMATCH')

  const recipeBytes = await recipeEntry.async('uint8array')
  if (new TextDecoder().decode(recipeBytes) !== canonicalJson(expected.recipe)) fail('RECIPE_CONTENT_MISMATCH')
  if (await sha256Hex(recipeBytes) !== manifest.recipeSha256) fail('RECIPE_HASH_MISMATCH')
  const sourceBytes = await sourceEntry.async('uint8array')
  if (await sha256Hex(sourceBytes) !== manifest.source.sha256) fail('SOURCE_HASH_MISMATCH')

  for (const size of BITMAP_FONT_SIZES) {
    const descriptor = archive!.file(`${size}/${expected.slug}-g.fnt`) ?? fail('FNT_MISSING')
    parseDescriptor(await descriptor.async('string'), `${expected.slug}-g_0.png`, expected.charset.codepoints)
    const image = archive!.file(`${size}/${expected.slug}-g_0.png`) ?? fail('PNG_MISSING')
    assertPng(await image.async('uint8array'))
  }

  const hashes: Array<[string, string]> = []
  for (const [path, entry] of entries) {
    if (path === 'manifest.json') continue
    hashes.push([path, await sha256Hex(await entry.async('uint8array'))])
  }
  const material = hashes.sort(([a], [b]) => utf8Compare(a, b)).map(([path, hash]) => `${path}\0${hash.toLowerCase()}\n`).join('')
  if (await sha256Hex(new TextEncoder().encode(material)) !== manifest.packageContentSha256) fail('PACKAGE_HASH_MISMATCH')
}
