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
    bitmapMode: false, properties: {}, orderIds: [],
    elements: ['background', 'hourHand', 'minuteHand', 'secondHand', 'centerCap']
      .map(eleType => ({ id: eleType, eleType, imageUrl })),
    visualThemes: {
      version: 1, enabled: true, selectionMode: 'user', defaultThemeId: 'lime',
      themes: [{
        id: 'lime', name: 'Lime Green', assets: {
          background: { imageUrl }, hourHand: { imageUrl }, minuteHand: { imageUrl },
          secondHand: { imageUrl }, centerCap: { imageUrl, targetSize: 75 },
        },
      }],
    },
  } as unknown as RuntimeDesignConfig
}

describe('WRT theme assets without database IDs', () => {
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
