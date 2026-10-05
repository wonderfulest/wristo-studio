import fs from 'node:fs'
import { File } from 'node:buffer'
import { afterEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
vi.hoisted(() => {
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(globalThis, key, {
    configurable: true, value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  })
})
vi.mock('@/api/image', () => ({ findImageByUrl: vi.fn(async () => ({ data: null })) }))
vi.mock('@/api/wristo/fonts', () => ({ getFontBySlug: vi.fn(async () => ({ data: null })) }))
const fixture = process.env.WRISTO_AI_WRT_FIXTURE
it.skipIf(!fixture)('imports server generated WRT, validates export and preserves bindings on re-import', async () => {
  setActivePinia(createPinia())
  const { readWrtDesignPackage, buildWrtDesignPackage } = await import('./designAssetBundleService')
  const { packageFonts } = await import('./packageAssetRegistry')
  const { useFontStore } = await import('@/stores/fontStore')
  const { validateRuntimeConfigForExport } = await import('./exportService')
  const loaded = await readWrtDesignPackage(new File([fs.readFileSync(fixture!)], 'ai-watchface.wrt') as any)
  expect(loaded.failures).toEqual([])
  for (const font of packageFonts.values()) useFontStore().registerServerFont(font)
  expect(await validateRuntimeConfigForExport(loaded.config)).toBe(true)
  const exported = await buildWrtDesignPackage(loaded.config)
  const again = await readWrtDesignPackage(exported)
  expect(again.failures).toEqual([])
  expect(again.config.properties).toEqual(loaded.config.properties)
  expect(again.config.elements.filter(e => e.eleType === 'data')).toHaveLength(3)
  expect(await validateRuntimeConfigForExport(again.config)).toBe(true)
}, 30000)
afterEach(async () => { (await import('./designAssetBundleService')).clearRestoredDesignAssetUrls() })
