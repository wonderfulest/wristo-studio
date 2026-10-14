import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('@/api/wristo/fonts', () => ({ getFontBySlug: vi.fn(), uploadFontFile: vi.fn() }))
import { getFontBySlug, uploadFontFile } from '@/api/wristo/fonts'
import { packageFonts, packageFontBuildFiles } from './packageAssetRegistry'
import { importPackageFonts } from './importPackageFonts'
const font = (slug: string, type = 'text_font') => ({ slug, type, language: 'en', ttfFile: { url: 'data:font/ttf;base64,AA==' } }) as any
beforeEach(() => { vi.resetAllMocks(); packageFonts.clear(); packageFontBuildFiles.clear() })
it('uploads all missing text and icon fonts and remaps nested references', async () => {
  packageFontBuildFiles.set('text', new Map([['36/text-g.fnt', new Blob(['page id=0 file="text-g_0.png"'])], ['36/text-g_0.png', new Blob(['pixels'])]]))
  packageFonts.set('text', font('text')); packageFonts.set('icons', font('icons', 'icon_font'))
  vi.mocked(getFontBySlug).mockResolvedValue({ data: null } as any)
  vi.mocked(uploadFontFile).mockResolvedValueOnce({ data: font('server-text') } as any).mockResolvedValueOnce({ data: font('server-icons') } as any)
  const config = { elements: [{ fontFamily: 'text', nested: { iconFont: 'icons', assetFontFamily: 'text' } }] }
  await importPackageFonts(config)
  expect(uploadFontFile).toHaveBeenCalledTimes(2)
  expect(vi.mocked(uploadFontFile).mock.calls[1][1]).toBe('icon_font')
  expect(config.elements[0]).toEqual({ fontFamily: 'server-text', nested: { iconFont: 'server-icons', assetFontFamily: 'server-text' } })
  expect(packageFonts.has('server-text')).toBe(true)
  expect(await packageFontBuildFiles.get('server-text')?.get('36/server-text-g.fnt')?.text()).toContain('server-text-g_0.png')
})
it('reuses existing fonts without uploading', async () => {
  packageFonts.set('text', font('text'))
  vi.mocked(getFontBySlug).mockResolvedValue({ data: font('text') } as any)
  await importPackageFonts({ fontFamily: 'text' })
  expect(uploadFontFile).not.toHaveBeenCalled()
})
it('does not treat network errors as missing fonts', async () => {
  packageFonts.set('text', font('text'))
  vi.mocked(getFontBySlug).mockRejectedValue(new Error('offline'))
  await expect(importPackageFonts({ fontFamily: 'text' })).rejects.toThrow('offline')
  expect(uploadFontFile).not.toHaveBeenCalled()
})
it('does not rewrite references after upload failure or cancellation', async () => {
  packageFonts.set('text', font('text'))
  vi.mocked(getFontBySlug).mockRejectedValue({ response: { status: 404 } })
  vi.mocked(uploadFontFile).mockRejectedValue(new Error('upload failed'))
  const config = { fontFamily: 'text' }
  await expect(importPackageFonts(config)).rejects.toThrow('upload failed')
  expect(config.fontFamily).toBe('text')
  await expect(importPackageFonts(config, () => false)).rejects.toThrow('cancelled')
})
it('rejects missing source bytes instead of silently importing an unregistered font', async () => {
  packageFonts.set('bitmap-only', { slug: 'bitmap-only' } as any)
  vi.mocked(getFontBySlug).mockResolvedValue({ data: null } as any)
  await expect(importPackageFonts({ fontFamily: 'bitmap-only' })).rejects.toThrow('Missing source file')
  expect(uploadFontFile).not.toHaveBeenCalled()
})
it.runIf(Boolean(process.env.WRISTO_IMPORT_TEST_WRT))('registers the supplied WRT source fonts with server-assigned slugs', async () => {
  const { readFileSync } = await import('node:fs')
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(readFileSync(process.env.WRISTO_IMPORT_TEST_WRT!))
  const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
  const design = JSON.parse(await zip.file('design.json')!.async('string'))
  for (const entry of manifest.fonts) {
    const bytes = await zip.file(entry.path)!.async('base64')
    packageFonts.set(entry.slug, { ...entry.metadata, ttfFile: { url: `data:font/ttf;base64,${bytes}` } })
  }
  vi.mocked(getFontBySlug).mockResolvedValue({ data: null } as any)
  vi.mocked(uploadFontFile).mockImplementation(async (file, type) => ({ data: font(`registered-${file.name.replace(/\.ttf$/, '')}`, type) }) as any)
  await importPackageFonts(design)
  expect(uploadFontFile).toHaveBeenCalledTimes(manifest.fonts.length)
  for (const entry of manifest.fonts) expect(packageFonts.has(`registered-${entry.slug}`)).toBe(true)
})
