import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('@/api/wristo/bitmapFont', () => ({ getBitmapFontDetail: vi.fn(), listBitmapFontChars: vi.fn(), createBitmapFont: vi.fn(), bindBitmapFontAsset: vi.fn() }))
vi.mock('./bitmapFontColon', () => ({ createBitmapFontColon: vi.fn(async () => new Blob(['colon'], { type: 'image/png' })) }))
import { getBitmapFontDetail, listBitmapFontChars, createBitmapFont, bindBitmapFontAsset } from '@/api/wristo/bitmapFont'
import { packageBitmapChars } from './packageAssetRegistry'
import { createBitmapFontColon } from './bitmapFontColon'
import { importBitmapFonts } from './importBitmapFonts'
const glyphs = (colon = true) => Array.from(colon ? '0123456789:' : '0123456789', (charValue) => ({ charValue, image: { url: 'data:image/png;base64,AA==' } })) as any
const config = () => ({ name: 'Example', elements: [9, 10, 11, 12].map((formatter) => ({ eleType: 'time', fontRenderType: 'bitmap', bitmapFontId: 900, formatter })) })
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(createBitmapFontColon).mockResolvedValue(new Blob(['colon'], { type: 'image/png' }))
  packageBitmapChars.clear()
  vi.mocked(createBitmapFont).mockResolvedValue({ data: { id: 42 } } as any)
  vi.mocked(bindBitmapFontAsset).mockResolvedValue({ data: true } as any)
})
it('uploads missing packaged font including colon and remaps every time slot', async () => {
  packageBitmapChars.set(900, glyphs(false))
  vi.mocked(getBitmapFontDetail).mockResolvedValue({ data: undefined } as any)
  vi.mocked(listBitmapFontChars).mockResolvedValue({ data: glyphs() } as any)
  const design = config()
  await importBitmapFonts(design)
  expect(design.elements.map((e) => e.bitmapFontId)).toEqual([42, 42, 42, 42])
  expect(bindBitmapFontAsset).toHaveBeenCalledTimes(11)
  expect(vi.mocked(bindBitmapFontAsset).mock.calls.map(([p]) => p.charValue)).toContain(':')
  expect(packageBitmapChars.get(42)?.map((c) => c.charValue)).toContain(':')
  expect(vi.mocked(bindBitmapFontAsset).mock.calls.find(([p]) => p.charValue === ':')?.[0].charType).toBe('symbol')
})
it('reuses complete server font', async () => {
  vi.mocked(getBitmapFontDetail).mockResolvedValue({ data: { id: 900 } } as any)
  vi.mocked(listBitmapFontChars).mockResolvedValue({ data: glyphs() } as any)
  const design = config()
  await importBitmapFonts(design)
  expect(design.elements[0].bitmapFontId).toBe(900)
  expect(createBitmapFont).not.toHaveBeenCalled()
})
it('does not treat network failure as missing font', async () => {
  vi.mocked(getBitmapFontDetail).mockRejectedValue(new Error('offline'))
  await expect(importBitmapFonts(config())).rejects.toThrow('offline')
  expect(createBitmapFont).not.toHaveBeenCalled()
})
it('does not rebind the design after an upload fails', async () => {
  packageBitmapChars.set(900, glyphs())
  vi.mocked(getBitmapFontDetail).mockResolvedValue({} as any)
  vi.mocked(bindBitmapFontAsset).mockRejectedValue(new Error('upload failed'))
  const design = config()
  await expect(importBitmapFonts(design)).rejects.toThrow('upload failed')
  expect(design.elements[0].bitmapFontId).toBe(900)
})
it('ignores stale TrueType references', async () => {
  await importBitmapFonts({ elements: [{ eleType: 'time', fontRenderType: 'ttf', bitmapFontId: 900 }] })
  expect(getBitmapFontDetail).not.toHaveBeenCalled()
})
it('copies an incomplete server font and leaves its original binding untouched until verified', async () => {
  vi.mocked(getBitmapFontDetail).mockResolvedValue({ data: { id: 900 } } as any)
  vi.mocked(listBitmapFontChars)
    .mockResolvedValueOnce({ data: glyphs(false) } as any)
    .mockResolvedValueOnce({ data: glyphs() } as any)
  const design = config()
  await importBitmapFonts(design)
  expect(design.elements[0].bitmapFontId).toBe(42)
  expect(vi.mocked(bindBitmapFontAsset).mock.calls.every(([p]) => p.fontId === 42)).toBe(true)
})
it('rejects a package missing a digit before creating a font', async () => {
  vi.mocked(getBitmapFontDetail).mockResolvedValue({} as any)
  packageBitmapChars.set(
    900,
    glyphs().filter((c: any) => c.charValue !== '7')
  )
  await expect(importBitmapFonts(config())).rejects.toThrow('Missing bitmap digit 900/7')
  expect(createBitmapFont).not.toHaveBeenCalled()
})
it('does not require digits or colon for non-time bitmap fonts', async () => {
  const chars = [{ charValue: 'A', image: { url: 'data:image/png;base64,AA==' } }] as any
  packageBitmapChars.set(900, chars)
  vi.mocked(getBitmapFontDetail).mockResolvedValue({ data: null } as any)
  vi.mocked(listBitmapFontChars).mockResolvedValue({ data: chars } as any)
  const design = { elements: [{ eleType: 'text', fontRenderType: 'bitmap', bitmapFontId: 900 }] }
  await importBitmapFonts(design)
  expect(bindBitmapFontAsset).toHaveBeenCalledTimes(1)
  expect(design.elements[0].bitmapFontId).toBe(42)
})
