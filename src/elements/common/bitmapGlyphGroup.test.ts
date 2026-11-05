// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { FabricImage, Rect } from 'fabric'
import { createBitmapGlyphGroup, invalidateBitmapTimeFontCache } from './bitmapGlyphGroup'
import { packageBitmapChars } from '@/engine/services/packageAssetRegistry'
vi.mock('@/api/wristo/bitmapFont', () => ({ listBitmapFontChars: vi.fn() }))
beforeEach(() => {
  invalidateBitmapTimeFontCache()
  packageBitmapChars.clear()
  packageBitmapChars.set(42, ['1', '.'].map(charValue => ({ charValue, image: { url: `https://example.test/${charValue}.png` } })) as any)
  vi.spyOn(FabricImage, 'fromURL').mockImplementation(async () => new Rect({ width: 10, height: 20, strokeWidth: 0 }) as any)
})
it('shares font glyphs and leaves a full blank cell for a missing data character', async () => {
  const options = { eleType: 'data', bitmapFontId: 42, fontSize: 20, fontGap: 2, left: 100, top: 100, originX: 'center', originY: 'center' }
  const group: any = await createBitmapGlyphGroup({ id: 'data', text: '-1.', options })
  expect(group.eleType).toBe('data')
  expect(group.getObjects()).toHaveLength(3)
  expect(group.getObjects()[0].fill).toBe('transparent')
  expect(group.width).toBeCloseTo(36)
  expect(group.text).toBe('-1.')
})
it('renders an entirely missing string as blank cells without substitution', async () => {
  const group: any = await createBitmapGlyphGroup({ id: 'empty', text: '--', options: { eleType: 'data', bitmapFontId: 42, fontSize: 20, fontGap: 0 } })
  expect(group.width).toBe(24)
  expect(group.getObjects().every((item: any) => item.fill === 'transparent')).toBe(true)
})
it('keeps the existing time bitmap identity', async () => {
  const group: any = await createBitmapGlyphGroup({ id: 'time', text: '11', options: { eleType: 'time', bitmapFontId: 42, fontSize: 20, fontGap: 0 } })
  expect(group.isBitmapTimeGroup).toBe(true)
  expect(group.width).toBe(20)
})
