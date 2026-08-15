import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { BITMAP_FONT_SIZES, type BitmapFontManifest, type BitmapFontRecipe } from '@/features/bitmap-font-maker/contracts'
import { canonicalJson, sha256Hex } from '@/features/bitmap-font-maker/packageBuilder'
import { repackageBitmapFontSlug } from './bitmapPackageRepack'
import { validateLocalBitmapPackage } from './localPackageValidation'

const recipe: BitmapFontRecipe = { schemaVersion: 1, rendererVersion: '1', fontWeight: 400, italicAngle: 0, outlineWidthEm: 0, outlineMode: 'fill', lineJoin: 'round', antialias: true }

async function packageFixture(pageFile = 'old-g_0.png') {
  const archive = new JSZip()
  const hashes = new Map<string, string>()
  const add = async (path: string, value: Uint8Array | string) => {
    const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
    archive.file(path, bytes, { createFolders: false })
    hashes.set(path, await sha256Hex(bytes))
  }
  const source = new Uint8Array([1, 2, 3])
  const recipeText = canonicalJson(recipe)
  const png = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0,73,69,78,68,174,66,96,130])
  await add('old.ttf', source)
  await add('recipe.json', recipeText)
  for (const size of BITMAP_FONT_SIZES) {
    await add(`${size}/old-g_0.png`, png)
    await add(`${size}/old-g.fnt`, `info face="Gold old Engraved" size=${size}\ncommon lineHeight=${size} base=${size} scaleW=16 scaleH=16 pages=1 packed=0\npage id=0 file="${pageFile}"\nchars count=1\nchar id=48 x=0 y=0 width=1 height=1 xoffset=0 yoffset=0 xadvance=1 page=0 chnl=15\n`)
  }
  const material = [...hashes].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([path, hash]) => `${path}\0${hash}\n`).join('')
  const manifest: BitmapFontManifest = {
    schemaVersion: 1, slug: 'old', type: 'number_font', language: 'en',
    source: { fileName: 'old.ttf', sha256: await sha256Hex(source) }, sizes: [...BITMAP_FONT_SIZES],
    charset: { profile: 'test', codepoints: [48] }, recipeSha256: await sha256Hex(new TextEncoder().encode(recipeText)),
    packageContentSha256: await sha256Hex(new TextEncoder().encode(material)),
  }
  archive.file('manifest.json', canonicalJson(manifest), { createFolders: false })
  return { zip: await archive.generateAsync({ type: 'arraybuffer' }), manifest, source, recipeText }
}

describe('repackageBitmapFontSlug', () => {
  it('changes only paths and page filename fields, preserving all source/recipe/face bytes', async () => {
    const fixture = await packageFixture()
    const repacked = await repackageBitmapFontSlug(fixture.zip, fixture.manifest, 'new-outline')
    const result = await JSZip.loadAsync(repacked.zip)
    const paths = Object.keys(result.files)

    expect(paths).toHaveLength(79)
    expect(paths).not.toContain('old.ttf')
    expect(paths).toContain('new-outline.ttf')
    expect(paths).toContain('6/new-outline-g_0.png')
    const descriptor = await result.file('6/new-outline-g.fnt')!.async('string')
    expect(descriptor).toContain('info face="Gold old Engraved"')
    expect(descriptor).toContain('page id=0 file="new-outline-g_0.png"')
    expect(await result.file('new-outline.ttf')!.async('uint8array')).toEqual(fixture.source)
    expect(await result.file('recipe.json')!.async('string')).toBe(fixture.recipeText)
    await expect(validateLocalBitmapPackage(repacked, {
      slug: 'new-outline', fontType: 'number_font', sourceFileName: 'Original.ttf', recipe,
      charset: { profile: 'test', codepoints: [48] },
    })).resolves.toBeUndefined()
  })

  it('rejects a descriptor whose unique page field does not match the old atlas', async () => {
    const fixture = await packageFixture('not-old.png')
    await expect(repackageBitmapFontSlug(fixture.zip, fixture.manifest, 'new-outline')).rejects.toThrow('FNT_PAGE_INVALID')
  })
})
