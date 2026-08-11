import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validateDataGoalBindings } from './propertyBindingValidation'
import type { FabricElement } from '@/types/element'
import type { PropertiesMap } from '@/types/properties'
import { createPinia, setActivePinia } from 'pinia'

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(), key: vi.fn(), length: 0 },
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(), key: vi.fn(), length: 0 },
  })
})

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

  it('exports only the normalized Connect IQ exclusion values', async () => {
    const { generateConfig } = await import('./exportService')
    const config = generateConfig({
      canvas: { getObjects: () => [{ id: 'global', eleType: 'global' }] } as any,
      properties: {},
      designId: 'design-1',
      watchFaceName: 'Exclusions',
      textCase: 0,
      bitmapMode: false,
      connectIqSettingsExcludedDataTypeValues: [31, '2', 31, null, true, 4.5],
    } as any)

    expect(config?.connectIqSettingsExcludedDataTypeValues).toEqual([2, 31])
    expect(config).not.toHaveProperty('connectIqSettingsDataTypeOptions')
    expect(config).not.toHaveProperty('connectIqSettingsDataTypeLabels')
  })

  it('exports data properties as symbol references with a deduplicated top-level map', async () => {
    const { generateConfig } = await import('./exportService')
    const steps = {
      valueCode: 1, metricSymbol: ':FIELD_TYPE_STEPS', category: 'field',
      settingsLabel: { eng: 'Steps', zhs: '步数' }, label: { eng: 'STEPS', zhs: '步数' },
      unitKey: 'none', iconUnicode: '0061', defaultValue: '0', isActive: 1,
      sortOrder: 1, dialMode: null, dialMin: null, dialMax: null, dialGoalSource: null,
    } as const
    const config = generateConfig({
      canvas: { getObjects: () => [{ id: 'global', eleType: 'global' }] } as any,
      properties: {
        data_1: { type: 'data', title: 'Primary', metricSymbols: [steps.metricSymbol], value: steps.metricSymbol },
      },
      dataOptions: { [steps.metricSymbol]: steps },
      catalogOptions: [steps],
      designId: 'design-1', watchFaceName: 'Normalized', textCase: 0, bitmapMode: true,
    } as any)

    expect(config?.properties.data_1).toEqual({
      type: 'data', title: 'Primary', metricSymbols: [steps.metricSymbol], value: steps.metricSymbol,
    })
    expect(config?.dataOptions).toEqual({ [steps.metricSymbol]: steps })
    expect(config?.properties.data_1).not.toHaveProperty('options')
  })

  it('rejects a data property whose selected symbol is outside its options', async () => {
    const { generateConfig } = await import('./exportService')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const config = generateConfig({
        canvas: { getObjects: () => [{ id: 'global', eleType: 'global' }] } as any,
        properties: {
          data_1: { type: 'data', title: 'Primary', metricSymbols: [':FIELD_TYPE_STEPS'], value: ':FIELD_TYPE_BATTERY' },
        },
        dataOptions: {}, catalogOptions: [],
        designId: 'design-1', watchFaceName: 'Invalid', textCase: 0, bitmapMode: true,
      } as any)

      expect(config).toBeNull()
    } finally {
      consoleError.mockRestore()
    }
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

  it('exports theme backgrounds when the base default background is filtered', async () => {
    const { generateConfig } = await import('./exportService')
    const { registerElement } = await import('@/engine/registry/elementRegistry')
    const {
      DEFAULT_BACKGROUND_COLOR,
      DEFAULT_BACKGROUND_IMAGE_URL,
    } = await import('@/elements/decoration/background/background.constants')
    registerElement('background' as any, {
      add: vi.fn() as any,
      encode: (element) => ({ ...(element as any) }),
    })
    const background = {
      id: 'background-1',
      eleType: 'background',
      imageId: null,
      imageUrl: DEFAULT_BACKGROUND_IMAGE_URL,
      wristoImageId: null,
      wristoImageUrl: DEFAULT_BACKGROUND_IMAGE_URL,
      color: DEFAULT_BACKGROUND_COLOR,
    }
    const visualThemes = {
      version: 1 as const,
      enabled: true,
      defaultThemeId: 'default',
      selectionMode: 'user' as const,
      themes: [{
        id: 'default',
        name: 'Default',
        assets: {
          background: {
            assetId: 41,
            imageUrl: 'https://cdn.example/theme-background.png',
          },
        },
      }],
    }

    const config = generateConfig({
      canvas: { getObjects: () => [background] } as any,
      properties: {},
      designId: 'design-1',
      watchFaceName: 'Background Theme',
      textCase: 0,
      bitmapMode: false,
      visualThemes,
      baseElements: [background],
    })

    expect(config?.elements).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ eleType: 'background' }),
    ]))
    expect(config?.visualThemes?.themes[0].assets.background).toEqual({
      assetId: 41,
      imageUrl: 'https://cdn.example/theme-background.png',
    })
  })

  it('exports persisted visual-theme base fields while the canvas is still previewing a theme', async () => {
    const { generateConfig } = await import('./exportService')
    const { registerElement } = await import('@/engine/registry/elementRegistry')
    for (const type of ['background', 'hourHand', 'rectangle', 'battery', 'label']) {
      registerElement(type as any, {
        add: vi.fn() as any,
        encode: (element) => ({ ...(element as any) }),
      })
    }
    const canvasElements = [
      {
        id: 'background',
        eleType: 'background',
        imageUrl: 'theme-bg.png',
        imageId: 102,
        color: '#eeeeee',
        colorProperty: 'Surface',
        left: 10,
        top: 10,
        width: 454,
        height: 454,
      },
      {
        id: 'hour',
        eleType: 'hourHand',
        imageUrl: 'theme-hour.svg',
        assetId: 202,
        left: 230,
        top: 227,
      },
      {
        id: 'rectangle',
        eleType: 'rectangle',
        fill: '#abcdef',
        fillProperty: 'Accent',
        stroke: '#fedcba',
        strokeProperty: 'Outline',
        left: 44,
        top: 55,
      },
      {
        id: 'battery',
        eleType: 'battery',
        bodyFill: '#999999',
        bodyFillProperty: 'Surface',
        headFill: '#888888',
        headFillProperty: 'Accent',
        left: 66,
        top: 77,
      },
      {
        id: 'label',
        eleType: 'label',
        fill: '#777777',
        left: 88,
        top: 99,
      },
    ]
    const baseElements = [
      {
        ...canvasElements[0],
        imageUrl: 'base-bg.png',
        imageId: 101,
        color: '#111111',
      },
      {
        ...canvasElements[1],
        imageUrl: 'base-hour.svg',
        assetId: 201,
        left: 227,
      },
      {
        ...canvasElements[2],
        fill: '#222222',
        stroke: '#333333',
        left: 22,
      },
      {
        ...canvasElements[3],
        bodyFill: '#444444',
        headFill: '#555555',
        left: 33,
      },
      {
        ...canvasElements[4],
        fill: '#666666',
        left: 44,
      },
    ]
    const visualThemes = {
      version: 1 as const,
      enabled: true,
      defaultThemeId: 'night',
      selectionMode: 'user' as const,
      themes: [{
        id: 'night',
        name: 'Night',
        assets: {
          background: { assetId: 102, imageUrl: 'theme-bg.png' },
          hourHand: { assetId: 202, imageUrl: 'theme-hour.svg' },
        },
      }],
    }

    const config = generateConfig({
      canvas: { getObjects: () => canvasElements } as any,
      baseElements: baseElements as any,
      properties: {
        Accent: { type: 'color', title: 'Accent', value: '#222222', themeMode: 'theme' },
        Outline: { type: 'color', title: 'Outline', value: '#333333', themeMode: 'theme' },
        Surface: { type: 'color', title: 'Surface', value: '#111111', themeMode: 'theme' },
      },
      designId: 'design-1',
      watchFaceName: 'Theme',
      textCase: 0,
      bitmapMode: false,
      visualThemes,
    })

    expect(config?.elements).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'background', imageUrl: 'base-bg.png', imageId: 101, color: '#111111' }),
      expect.objectContaining({ id: 'hour', imageUrl: 'base-hour.svg', assetId: 201, left: 230 }),
      expect.objectContaining({ id: 'rectangle', fill: '#222222', stroke: '#333333', left: 44 }),
      expect.objectContaining({ id: 'battery', bodyFill: '#444444', headFill: '#555555', left: 66 }),
      expect.objectContaining({ id: 'label', fill: '#777777', left: 88 }),
    ]))
    expect(config?.visualThemes).toEqual(visualThemes)
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
        }],
      },
    }

    const resolved = await resolvePackageAssetUrls(config as any)

    expect(resolved?.elements).toEqual([])
    expect(resolved?.visualThemes?.themes[0].assets.hourHand?.imageUrl)
      .toBe('https://cdn.example/original-21.svg')
  })
})
