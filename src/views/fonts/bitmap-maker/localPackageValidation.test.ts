import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { BITMAP_FONT_SIZES, type BitmapFontManifest, type BitmapFontRecipe } from '@/features/bitmap-font-maker/contracts'
import { canonicalJson, sha256Hex } from '@/features/bitmap-font-maker/packageBuilder'
import { validateLocalBitmapPackage } from './localPackageValidation'

const recipe: BitmapFontRecipe = { schemaVersion: 1, rendererVersion: '1', fontWeight: 400, italicAngle: 0, outlineWidthEm: 0, outlineMode: 'fill', lineJoin: 'round', antialias: true }
const source = new Uint8Array([1, 2, 3])
const png = new Uint8Array([137,80,78,71,13,10,26,10, 0,0,0,13,73,72,68,82, 0,0,0,16,0,0,0,16,8,6,0,0,0, 0,0,0,0, 0,0,0,0,73,69,78,68,174,66,96,130])

async function packageFixture(mutate?: (zip: JSZip) => void) {
  const zip = new JSZip()
  const hashes = new Map<string, string>()
  const add = async (path: string, value: Uint8Array | string) => {
    const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
    zip.file(path, bytes, { createFolders: false })
    hashes.set(path, await sha256Hex(bytes))
  }
  await add('precision.ttf', source)
  await add('recipe.json', canonicalJson(recipe))
  for (const size of BITMAP_FONT_SIZES) {
    await add(`${size}/precision-g_0.png`, png)
    await add(`${size}/precision-g.fnt`, `info face="Precision" size=${size}\ncommon lineHeight=${size} base=${size} scaleW=16 scaleH=16 pages=1 packed=0\npage id=0 file="precision-g_0.png"\nchars count=1\nchar id=48 x=0 y=0 width=1 height=1 xoffset=0 yoffset=0 xadvance=1 page=0 chnl=15\n`)
  }
  const material = [...hashes].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([path, hash]) => `${path}\0${hash}\n`).join('')
  const manifest: BitmapFontManifest = {
    schemaVersion: 1, slug: 'precision', type: 'number_font', language: 'en',
    source: { fileName: 'precision.ttf', sha256: await sha256Hex(source) },
    sizes: [...BITMAP_FONT_SIZES], charset: { profile: 'test-numbers', codepoints: [48] },
    recipeSha256: await sha256Hex(new TextEncoder().encode(canonicalJson(recipe))),
    packageContentSha256: await sha256Hex(new TextEncoder().encode(material)),
  }
  zip.file('manifest.json', canonicalJson(manifest), { createFolders: false })
  mutate?.(zip)
  return { artifact: { zip: await zip.generateAsync({ type: 'arraybuffer' }), manifest }, expected: { slug: 'precision', fontType: 'number_font' as const, sourceFileName: 'Precision.ttf', recipe, charset: { profile: 'test-numbers', codepoints: [48] } } }
}

describe('validateLocalBitmapPackage', () => {
  it('accepts an exact 79-file package and verifies every hash and descriptor', async () => {
    const fixture = await packageFixture()
    await expect(validateLocalBitmapPackage(fixture.artifact, fixture.expected)).resolves.toBeUndefined()
  })

  it('rejects unexpected entries and package hashes that no longer cover the archive', async () => {
    const fixture = await packageFixture(zip => zip.file('unexpected.txt', 'bad', { createFolders: false }))
    await expect(validateLocalBitmapPackage(fixture.artifact, fixture.expected)).rejects.toThrow('PACKAGE_ENTRY_COUNT')
  })

  it('rejects descriptor pages or PNGs that are not structurally complete', async () => {
    const fixture = await packageFixture(zip => zip.file('6/precision-g.fnt', 'info face="Precision" size=6\ncommon lineHeight=6 base=6 scaleW=16 scaleH=16 pages=1 packed=0\npage id=0 file="wrong.png"\nchars count=0\n', { createFolders: false }))
    await expect(validateLocalBitmapPackage(fixture.artifact, fixture.expected)).rejects.toThrow('FNT_PAGE_INVALID')
  })

  it.each([
    ['FNT_SCALE_MISMATCH', 'common lineHeight=6 base=6 scaleW=15 scaleH=16 pages=1 packed=0'],
    ['FNT_PAGES_INVALID', 'common lineHeight=6 base=6 scaleW=16 scaleH=16 pages=2 packed=0'],
    ['FNT_CHAR_BOUNDS_INVALID', 'char id=48 x=16 y=0 width=1 height=1 xoffset=0 yoffset=0 xadvance=1 page=0 chnl=15'],
    ['FNT_CHAR_PAGE_INVALID', 'char id=48 x=0 y=0 width=1 height=1 xoffset=0 yoffset=0 xadvance=1 page=1 chnl=15'],
  ])('rejects %s descriptor metrics', async (code, replacement) => {
    const fixture = await packageFixture(zip => {
      const base = `info face="Precision" size=6\ncommon lineHeight=6 base=6 scaleW=16 scaleH=16 pages=1 packed=0\npage id=0 file="precision-g_0.png"\nchars count=1\nchar id=48 x=0 y=0 width=1 height=1 xoffset=0 yoffset=0 xadvance=1 page=0 chnl=15\n`
      const linePrefix = replacement.startsWith('common') ? 'common' : 'char id='
      zip.file('6/precision-g.fnt', base.split('\n').map(line => line.startsWith(linePrefix) ? replacement : line).join('\n'), { createFolders: false })
    })
    await expect(validateLocalBitmapPackage(fixture.artifact, fixture.expected)).rejects.toThrow(code)
  })

  it.each([20, 21, 23, 32])('maps a %i-byte truncated PNG to stable IHDR validation', async (length) => {
    const truncated = new Uint8Array(length)
    truncated.set([137,80,78,71,13,10,26,10])
    const fixture = await packageFixture(zip => zip.file('6/precision-g_0.png', truncated, { createFolders: false }))
    await expect(validateLocalBitmapPackage(fixture.artifact, fixture.expected)).rejects.toThrow('PNG_IHDR_INVALID')
  })

  it.each([
    ['length', (bytes: Uint8Array) => { bytes[11] = 12 }],
    ['type', (bytes: Uint8Array) => { bytes[12] = 88 }],
  ])('rejects a bad IHDR %s without leaking a DataView error', async (_label, mutate) => {
    const invalid = png.slice()
    mutate(invalid)
    const fixture = await packageFixture(zip => zip.file('6/precision-g_0.png', invalid, { createFolders: false }))
    await expect(validateLocalBitmapPackage(fixture.artifact, fixture.expected)).rejects.toThrow('PNG_IHDR_INVALID')
  })
})
