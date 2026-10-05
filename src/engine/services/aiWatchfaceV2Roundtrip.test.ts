import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { File } from 'node:buffer'
import { afterEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { collectTokenDependencies } from '@/engine/expression/dependencies'
import { validateDynamicImage } from '@/elements/decoration/dynamicImage/dynamicImage.validation'
import { resolveDynamicImageSelection } from '@/elements/decoration/dynamicImage/dynamicImage.selection'
import type { DynamicImageElementConfig } from '@/types/elements/dynamicImage'
vi.hoisted(() => {
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(globalThis, key, {
    configurable: true, value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  })
})
vi.mock('@/api/image', () => ({ findImageByUrl: vi.fn(async () => ({ data: null })) }))
vi.mock('@/api/wristo/fonts', () => ({ getFontBySlug: vi.fn(async () => ({ data: null })) }))
const fixture = process.env.WRISTO_AI_WRT_V2_FIXTURE

it.skipIf(!fixture)('preserves v2 editable scene elements and resolved resources through Studio export', async () => {
  setActivePinia(createPinia())
  const { readWrtDesignPackage, buildWrtDesignPackage } = await import('./designAssetBundleService')
  const { packageFonts } = await import('./packageAssetRegistry')
  const { useFontStore } = await import('@/stores/fontStore')
  const { validateRuntimeConfigForExport } = await import('./exportService')
  const loaded = await readWrtDesignPackage(new File([fs.readFileSync(fixture!)], 'expanded.wrt') as any)
  expect(loaded.failures).toEqual([])
  for (const font of packageFonts.values()) useFontStore().registerServerFont(font)
  expect(await validateRuntimeConfigForExport(loaded.config)).toBe(true)
  const types = new Set(loaded.config.elements.map(e => e.eleType))
  for (const type of ['background', 'circle', 'line', 'text', 'date', 'data', 'battery', 'image', 'dynamicImage']) expect(types.has(type as any), type).toBe(true)
  expect(loaded.config.elements.filter(e => e.eleType === 'data')).toHaveLength(3)
  const handTypes = ['hourHand', 'minuteHand', 'secondHand']
  for (const type of handTypes) {
    const hand = loaded.config.elements.find(e => e.eleType === type) as any
    expect(hand, type).toBeDefined()
    expect(hand.imageUrl).toMatch(/^blob:/)
    expect(hand.rotationCenter).toEqual({ x: hand.centerX, y: hand.centerY })
    expect((await (await fetch(hand.imageUrl)).arrayBuffer()).byteLength).toBeGreaterThan(100)
  }
  const images = loaded.config.elements.filter(e => e.eleType === 'image') as any[]
  expect(images.length).toBeGreaterThanOrEqual(3)
  for (const image of images) expect(image.imageUrl).toMatch(/^blob:/)
  const exported = await buildWrtDesignPackage(loaded.config)
  const again = await readWrtDesignPackage(exported)
  expect(again.failures).toEqual([])
  expect(await validateRuntimeConfigForExport(again.config)).toBe(true)
  expect(again.config.properties).toEqual(loaded.config.properties)
  expect(again.config.elements.map(e => e.eleType)).toEqual(loaded.config.elements.map(e => e.eleType))
  for (const type of handTypes) {
    const before = loaded.config.elements.find(e => e.eleType === type) as any
    const after = again.config.elements.find(e => e.eleType === type) as any
    for (const key of ['centerX', 'centerY', 'rotationCenter', 'targetHeight', 'pivotOffsetX', 'pivotOffsetY']) expect(after[key]).toEqual(before[key])
    expect(after.imageUrl).toMatch(/^blob:/)
  }
  const groups = again.config.elements.filter(e => e.eleType === 'dynamicImage') as DynamicImageElementConfig[]
  const seenTokens = new Set<string>()
  for (const group of groups) {
    // This validates each source against the catalog and checks its stored AST matches the parser.
    expect(validateDynamicImage(group, again.config.properties), group.layerName).toEqual([])
    const dependencies = new Set(group.items.flatMap(item => [...collectTokenDependencies(item.expression!.ast)]))
    expect(dependencies.size).toBe(1)
    const token = [...dependencies][0]
    seenTokens.add(token)
    const selected = new Set<number>()
    const selectedAssets = new Set<string>()
    for (let value = 0; value <= 100; value++) {
      const selection = resolveDynamicImageSelection({ ...group, tokenValues: { [token]: value } })
      expect(selection.kind).toBe('item')
      if (selection.kind === 'item') {
        selected.add(selection.index); selectedAssets.add(selection.asset.imageUrl)
        expect(selection.asset.imageUrl).toMatch(/^blob:/)
      }
    }
    const unknown = resolveDynamicImageSelection({ ...group, tokenValues: {} })
    expect(unknown).toMatchObject({ kind: 'item', index: group.items.length - 1 })
    expect(selected.size, token).toBeGreaterThan(1)
    expect(selectedAssets.size, token).toBe(selected.size)
    const frameHashes = new Set<string>()
    for (const item of group.items) {
      expect(item.imageUrl).toMatch(/^blob:/)
      const bytes = Buffer.from(await (await fetch(item.imageUrl)).arrayBuffer())
      expect(bytes.byteLength).toBeGreaterThan(50)
      frameHashes.add(createHash('sha256').update(bytes).digest('hex'))
    }
    expect(frameHashes.size, token).toBe(group.items.length)
    const previous = loaded.config.elements.find(e => e.id === group.id) as DynamicImageElementConfig
    expect(group.items.map(item => item.expression)).toEqual(previous.items.map(item => item.expression))
  }
  expect(seenTokens).toEqual(new Set(['astronomy.moonPhase', 'weather.current.conditionCode', 'time.second', 'system.battery.level']))
}, 30000)
afterEach(async () => { (await import('./designAssetBundleService')).clearRestoredDesignAssetUrls() })
