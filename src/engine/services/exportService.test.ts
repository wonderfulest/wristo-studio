import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validateDataGoalBindings } from './propertyBindingValidation'
import type { FabricElement } from '@/types/element'
import type { PropertiesMap } from '@/types/properties'
import { createPinia, setActivePinia } from 'pinia'

const getAnalogAsset = vi.fn()

vi.mock('@/api/wristo/analogAsset', () => ({
  analogAssetApi: { get: getAnalogAsset },
}))

describe('validateDataGoalBindings', () => {
  it('rejects a data element bound to a missing data property', () => {
    const objects = [
      {
        eleType: 'data',
        dataProperty: 'data_6',
      } as FabricElement,
    ]
    const properties: PropertiesMap = {}

    const translate = (key: string, params?: Record<string, string | number>) => {
      if (key === 'export.validation.missingDataProperty') {
        return `Data element references missing data property (${params?.key})`
      }
      return key
    }

    expect(validateDataGoalBindings(objects, properties, translate)).toEqual([
      'Data element references missing data property (data_6)',
    ])
  })
})

describe('visual theme export persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getAnalogAsset.mockReset()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  })

  it('copies visual themes into generated config without preview-only state', async () => {
    const { generateConfig } = await import('./exportService')
    const visualThemes = {
      version: 1 as const,
      enabled: true,
      defaultThemeId: 'classic',
      selectionMode: 'user' as const,
      themes: [{
        id: 'classic',
        name: 'Classic',
        assets: {
          hourHand: { assetId: 11, imageUrl: 'blob:hour' },
          minuteHand: { assetId: 12, imageUrl: 'blob:minute' },
        },
        colors: {},
        fallbackHands: {
          hourColor: '0xFFFFFF',
          minuteColor: '0xFFFFFF',
          secondColor: '0xFF0000',
        },
      }],
    }
    const canvas = {
      getObjects: () => [{
        id: 'global',
        eleType: 'global',
      }],
    }

    const config = generateConfig({
      canvas: canvas as any,
      properties: {},
      designId: 'design-1',
      watchFaceName: 'Theme',
      textCase: 0,
      bitmapMode: false,
      visualThemes,
    })

    expect(config?.visualThemes).toEqual(visualThemes)
    expect(config?.visualThemes).not.toBe(visualThemes)
    expect(JSON.stringify(config)).not.toContain('previewThemeId')
  })

  it('resolves every themed analog asset once while preserving background URL', async () => {
    const { resolvePackageAssetUrls } = await import('./exportService')
    getAnalogAsset.mockImplementation(async (id: number) => ({
      data: { file: { url: `https://cdn.example/original-${id}.svg` } },
    }))
    const config = {
      version: '1',
      properties: {},
      designId: 'design-1',
      name: 'Theme',
      textCase: 0,
      bitmapMode: false,
      elements: [],
      orderIds: [],
      visualThemes: {
        version: 1,
        enabled: true,
        defaultThemeId: 'classic',
        selectionMode: 'user',
        themes: [{
          id: 'classic',
          name: 'Classic',
          assets: {
            background: { assetId: 99, imageUrl: 'https://cdn.example/background.png' },
            hourHand: { assetId: 11, imageUrl: 'blob:hour' },
            minuteHand: { assetId: 11, imageUrl: 'blob:hour-again' },
            secondHand: { assetId: 12, imageUrl: 'blob:second' },
            centerCap: { assetId: 13, imageUrl: 'blob:cap', targetSize: 32 },
          },
          colors: {},
          fallbackHands: {
            hourColor: '0xFFFFFF',
            minuteColor: '0xFFFFFF',
            secondColor: '0xFF0000',
          },
        }],
      },
    }

    const resolved = await resolvePackageAssetUrls(config as any)
    const assets = resolved!.visualThemes!.themes[0].assets

    expect(assets.background).toEqual({
      assetId: 99,
      imageUrl: 'https://cdn.example/background.png',
    })
    expect(assets.hourHand?.imageUrl).toBe('https://cdn.example/original-11.svg')
    expect(assets.minuteHand?.imageUrl).toBe('https://cdn.example/original-11.svg')
    expect(assets.secondHand?.imageUrl).toBe('https://cdn.example/original-12.svg')
    expect(assets.centerCap).toEqual({
      assetId: 13,
      imageUrl: 'https://cdn.example/original-13.svg',
      targetSize: 32,
    })
    expect(getAnalogAsset).toHaveBeenCalledTimes(3)
  })

  it('resolves visual themes when a legacy config omits elements', async () => {
    const { resolvePackageAssetUrls } = await import('./exportService')
    getAnalogAsset.mockResolvedValue({
      data: { file: { url: 'https://cdn.example/original-21.svg' } },
    })
    const config = {
      version: '1',
      properties: {},
      designId: 'design-1',
      name: 'Theme',
      textCase: 0,
      bitmapMode: false,
      orderIds: [],
      visualThemes: {
        version: 1,
        enabled: true,
        defaultThemeId: 'classic',
        selectionMode: 'user',
        themes: [{
          id: 'classic',
          name: 'Classic',
          assets: {
            hourHand: { assetId: 21, imageUrl: 'blob:hour' },
          },
          colors: {},
          fallbackHands: {
            hourColor: '0xFFFFFF',
            minuteColor: '0xFFFFFF',
            secondColor: '0xFF0000',
          },
        }],
      },
    }

    const resolved = await resolvePackageAssetUrls(config as any)

    expect(resolved?.elements).toEqual([])
    expect(resolved?.visualThemes?.themes[0].assets.hourHand?.imageUrl)
      .toBe('https://cdn.example/original-21.svg')
  })
})
