import { readFileSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { packageFonts, packageFontBuildFiles, packageBitmapChars } from './packageAssetRegistry'
vi.hoisted(() => {
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(globalThis, key, {
    configurable: true, value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  })
})

it.each([
  ['orbital-bitmap-20260921/orbital-lime-bitmap.wrt', 9212601],
  ['orbital-sunset-rounded-20260921/orbital-sunset-rounded.wrt', 9212701],
  ['orbital-sunset-compact-20260921/orbital-sunset-compact.wrt', 9212801],
] as const)('imports four curved colored bitmap digit sets: %s', async (relativePath, baseId) => {
  setActivePinia(createPinia())
  const { readWrtDesignPackage } = await import('./designAssetBundleService')
  const path = '/Users/mac/workspace/wristo/wristo-resources/generated/' + relativePath
  const imported = await readWrtDesignPackage(new File([readFileSync(path)], 'orbital.wrt'))
  expect(imported.failures).toEqual([])
  const digits = imported.config.elements.filter((e: any) => e.eleType === 'time')
  expect(digits.map((e: any) => e.formatter)).toEqual([9, 10, 11, 12])
  for (let q = 0; q < 4; q++) {
    expect(digits[q]).toMatchObject({fontRenderType: 'bitmap', bitmapFontId: baseId + q, fontSize: 227})
    const chars = packageBitmapChars.get(baseId + q)!
    expect(chars).toHaveLength(10)
    expect(chars.map(c => c.charValue).sort().join('')).toBe('0123456789')
    for (const c of chars) expect(c.image?.url).toMatch(/^blob:/)
  }
})
vi.mock('@/api/image', () => ({ findImageByUrl: vi.fn() }))
vi.mock('@/api/wristo/fonts', () => ({ getFontBySlug: vi.fn() }))
vi.mock('@/api/wristo/weather', () => ({ getWeatherConditions: vi.fn() }))
const root = '/Users/mac/workspace/wristo/wristo-resources/generated/gradient-digital-20260921/'
it('reproduces missing font registration and imports the repaired package', async () => {
  setActivePinia(createPinia())
  const { readWrtDesignPackage } = await import('./designAssetBundleService')
  const file = (name: string) => new File([readFileSync(root + name)], name)
  await expect(readWrtDesignPackage(file('gradient-digital.wrt'))).rejects.toThrow('Missing packaged font: roboto-condensed-regular')
  const imported = await readWrtDesignPackage(file('gradient-digital-fonts-fixed.wrt'))
  expect(imported.failures).toEqual([])
  expect(imported.config.elements).toHaveLength(2)
  expect(packageFonts.has('roboto-condensed-regular')).toBe(true)
  expect(packageFontBuildFiles.get('roboto-condensed-regular')?.size).toBeGreaterThan(0)
})
