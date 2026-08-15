import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { repackageBitmapFontSlug } from './bitmapPackageRepack'
import type { BitmapFontManifest } from '@/features/bitmap-font-maker/contracts'

describe('repackageBitmapFontSlug', () => {
  it('renames cached package assets and descriptor references without rasterizing', async () => {
    const archive = new JSZip()
    archive.file('old.ttf', new Uint8Array([1]))
    archive.file('6/old-g_0.png', new Uint8Array([137, 80, 78, 71]))
    archive.file('6/old.fnt', 'info face="Old"\npage id=0 file="old-g_0.png"\n')
    archive.file('recipe.json', '{}')
    archive.file('manifest.json', '{}')
    const zip = await archive.generateAsync({ type: 'arraybuffer' })
    const manifest = {
      schemaVersion: 1, slug: 'old', type: 'number_font', language: 'en',
      source: { fileName: 'old.ttf', sha256: 'source-hash' }, sizes: [6],
      charset: { profile: 'wristo-number-v1', codepoints: [48] }, recipeSha256: 'recipe-hash', packageContentSha256: 'old-hash',
    } satisfies BitmapFontManifest

    const repacked = await repackageBitmapFontSlug(zip, manifest, 'new-outline')
    const result = await JSZip.loadAsync(repacked.zip)

    expect(result.file('old.ttf')).toBeNull()
    expect(result.file('new-outline.ttf')).not.toBeNull()
    expect(result.file('6/new-outline-g_0.png')).not.toBeNull()
    await expect(result.file('6/new-outline.fnt')!.async('string')).resolves.toContain('new-outline-g_0.png')
    expect(repacked.manifest).toMatchObject({ slug: 'new-outline', source: { fileName: 'new-outline.ttf' } })
    expect(repacked.manifest.packageContentSha256).not.toBe('old-hash')
  })
})
