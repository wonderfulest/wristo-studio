import JSZip from 'jszip'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RuntimeDesignConfig } from '@/types/app/config'

vi.hoisted(() => {
  for (const key of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
    })
  }
})
vi.mock('@/api/image', () => ({ findImageByUrl: vi.fn(async () => ({ data: null })) }))
vi.mock('@/api/wristo/fonts', () => ({ getFontBySlug: vi.fn(async () => ({ data: null })) }))

const urls: string[] = []
beforeEach(() => { setActivePinia(createPinia()) })
afterEach(async () => {
  urls.splice(0).forEach(url => URL.revokeObjectURL(url))
  const { clearRestoredDesignAssetUrls } = await import('./designAssetBundleService')
  clearRestoredDesignAssetUrls()
})

function createConfig(): RuntimeDesignConfig {
  const imageUrl = URL.createObjectURL(new Blob([
    '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><path fill="#A2FF01" d="M0 0h4v4H0z"/></svg>',
  ], { type: 'image/svg+xml' }))
  urls.push(imageUrl)
  return {
    name: 'Theme roundtrip', version: '1', designId: 'roundtrip', textCase: 0,
    bitmapMode: false, properties: { accent: { type: 'color', title: 'Color 1', value: '0xFFFFFF', sortOrder: 0 } }, orderIds: [],
    elements: ['background', 'hourHand', 'minuteHand', 'secondHand', 'centerCap']
      .map(eleType => ({ id: eleType, eleType, imageUrl })),
    visualThemes: {
      version: 1, enabled: true, selectionMode: 'user', defaultThemeId: 'lime',
      themes: [{
        id: 'lime', name: 'Lime Green', colors: { accent: '0x123ABC' }, assets: {
          background: { imageUrl }, hourHand: { imageUrl }, minuteHand: { imageUrl },
          secondHand: { imageUrl }, centerCap: { imageUrl, targetSize: 75, left: 0, top: 123 },
        },
      }],
    },
  } as unknown as RuntimeDesignConfig
}

describe('WRT theme assets without database IDs', () => {
  it('roundtrips theme frame bytes and declares the new capability', async () => {
    const { buildWrtDesignPackage, readWrtDesignPackage } = await import('./designAssetBundleService')
    const source = createConfig()
    const imageUrl = source.visualThemes!.themes[0].assets.background!.imageUrl!
    source.elements.push({ id: 'turtle', eleType: 'dynamicImage', items: [
      { id: 'rest', imageUrl, expression: { source: 'true', resultType: 'boolean', version: 1, ast: { type: 'literal', valueType: 'boolean', value: true } } },
    ] } as any)
    source.visualThemes!.themes[0].dynamicImages = { turtle: { rest: { assetId: null, imageUrl } } }
    const file = await buildWrtDesignPackage(source)
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
    expect(manifest.version).toBe(3)
    expect(manifest.requiredFeatures).toContain('visual-theme-dynamic-images-v1')
    const imported = await readWrtDesignPackage(file)
    const ref = imported.config.visualThemes!.themes[0].dynamicImages!.turtle.rest
    expect(ref.imageUrl).toMatch(/^blob:/)
    expect(await (await fetch(ref.imageUrl!)).text()).toContain('#A2FF01')
    const again = await readWrtDesignPackage(await buildWrtDesignPackage(imported.config))
    expect(await (await fetch(again.config.visualThemes!.themes[0].dynamicImages!.turtle.rest.imageUrl!)).text()).toContain('#A2FF01')
  })

  it('imports, validates and re-exports embedded theme bytes without persistent asset IDs', async () => {
    const { buildWrtDesignPackage, readWrtDesignPackage } = await import('./designAssetBundleService')
    const { validateRuntimeConfigForExport } = await import('./exportService')
    const source = await buildWrtDesignPackage(createConfig())
    const { config } = await readWrtDesignPackage(source)
    const assets = config.visualThemes!.themes[0].assets
    for (const asset of Object.values(assets)) {
      expect(asset.imageUrl).toMatch(/^blob:/)
      expect(asset.assetId).toBeUndefined()
    }
    expect(await validateRuntimeConfigForExport(config)).toBe(true)
    const exported = await buildWrtDesignPackage(config)
    const zip = await JSZip.loadAsync(await exported.arrayBuffer())
    const saved = JSON.parse(await zip.file('design.json')!.async('string'))
    expect(saved.visualThemes.themes[0].assets.centerCap).toMatchObject({ targetSize: 75, left: 0, top: 123 })
    expect(saved.visualThemes.themes[0].colors).toEqual({ accent: '0x123ABC' })
    expect(saved.visualThemes.defaultThemeId).toBe('lime')
    expect(saved.visualThemes.themes[0].name).toBe('Lime Green')
    for (const asset of Object.values(saved.visualThemes.themes[0].assets) as any[]) {
      expect(asset.imageUrl).toMatch(/^bundle:\/\//)
      expect(asset.assetId).toBeUndefined()
      const bytes = await zip.file(asset.imageUrl.slice('bundle://'.length))!.async('string')
      expect(bytes).toContain('fill="#A2FF01"')
    }
    await expect(readWrtDesignPackage(exported)).resolves.toHaveProperty('config.visualThemes.defaultThemeId', 'lime')
  })

  it('fails packaging when a theme blob is no longer readable', async () => {
    const { buildWrtDesignPackage } = await import('./designAssetBundleService')
    const config = createConfig()
    URL.revokeObjectURL(config.visualThemes!.themes[0].assets.background!.imageUrl!)
    await expect(buildWrtDesignPackage(config)).rejects.toThrow()
  })
})

it('embeds an unused custom icon and restores its bytes through WRT', async () => {
  const { buildWrtDesignPackage, readWrtDesignPackage } = await import('./designAssetBundleService')
  const config = createConfig()
  config.watchfaceIcons = [{ id: 'custom:unused', kind: 'custom', name: 'Unused', imageUrl: (config.elements[0] as any).imageUrl }]
  const file = await buildWrtDesignPackage(config)
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const saved = JSON.parse(await zip.file('design.json')!.async('string'))
  expect(saved.watchfaceIcons[0].imageUrl).toMatch(/^bundle:\/\//)
  const restored = await readWrtDesignPackage(file)
  expect(restored.config.watchfaceIcons![0]).toMatchObject({ id: 'custom:unused', name: 'Unused' })
  expect(await (await fetch(restored.config.watchfaceIcons![0].imageUrl)).text()).toContain('#A2FF01')
})
