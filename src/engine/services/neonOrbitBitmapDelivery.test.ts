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
it('imports the Neon Orbit bitmap delivery and restores all hour images and hands', async () => {
  setActivePinia(createPinia())
  const { readWrtDesignPackage } = await import('./designAssetBundleService')
  const p = '/Users/mac/workspace/wristo/wristo-resources/assets/watchfaces/neon-orbit-bitmap-20260921/neon-orbit-bitmap.wrt'
  const loaded = await readWrtDesignPackage(new File([fs.readFileSync(p)], 'neon-orbit-bitmap.wrt') as any)
  const elements = loaded.config.elements as any[]
  const hour = elements.find(e => e.id === 'bitmap-hour')
  expect(hour.items).toHaveLength(12)
  for (let i = 0; i < 12; i++) {
    expect(hour.items[i].imageUrl).toMatch(/^blob:/)
    expect(hour.items[i].expression.ast.right.value).toBe(i + 1)
  }
  for (const id of ['hour-hand', 'minute-hand', 'center-cap']) {
    expect(elements.find(e => e.id === id).imageUrl).toMatch(/^blob:/)
  }
  expect(loaded.config.properties.goal_left.value).toBe(1)
  expect(loaded.config.properties.goal_right.value).toBe(9)
})
