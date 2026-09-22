import fs from 'node:fs'
import { File } from 'node:buffer'
import { it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
vi.hoisted(() => {
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(globalThis, key, {
    configurable: true, value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  })
})
vi.mock('@/api/image', () => ({ findImageByUrl: vi.fn(async () => ({ data: null })) }))
vi.mock('@/api/wristo/fonts', () => ({ getFontBySlug: vi.fn(async () => ({ data: null })) }))
it.each(['neonorbitbitmap-all-translucent-fixed.wrt', 'neonorbitbitmap-frosted-glass.wrt'])('rejects stale PNG hashes and restores every hour in %s', async (delivery) => {
  setActivePinia(createPinia())
  const { readWrtDesignPackage } = await import('./designAssetBundleService')
  const file = (name: string) => new File([fs.readFileSync('/Users/mac/Downloads/' + name)], name) as any
  await expect(readWrtDesignPackage(file('neonorbitbitmap-all-translucent-v2.decrypted.wrt')))
    .rejects.toThrow('Missing or corrupt package asset: assets/dynamicImage/bitmap-hour-imageUrl.png')
  const loaded = await readWrtDesignPackage(file(delivery))
  expect(loaded.failures).toEqual([])
  expect(loaded.config.elements).toHaveLength(11)
  const hour = loaded.config.elements.find((e: any) => e.id === 'bitmap-hour') as any
  expect(hour.items).toHaveLength(12)
  for (const item of hour.items) expect(item.imageUrl).toMatch(/^blob:/)
  for (const id of ['hour-hand', 'minute-hand', 'center-cap']) {
    expect((loaded.config.elements.find((e: any) => e.id === id) as any).imageUrl).toMatch(/^blob:/)
  }
}, 60000)
