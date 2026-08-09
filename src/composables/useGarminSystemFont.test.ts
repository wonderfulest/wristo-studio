import { describe, expect, it, vi } from 'vitest'
import {
  refreshGarminSystemFontPreviews,
  resolveElementPreviewFont,
  resolveSystemFontUpdate,
  toFabricSystemFontSize,
} from './useGarminSystemFont'

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    },
  })
})

describe('system font preview', () => {
  it('converts Garmin simulator TTF point size to canvas pixels', () => {
    expect(toFabricSystemFontSize(9.4018)).toBe(31)
    expect(toFabricSystemFontSize(9.9777)).toBe(33)
  })

  it('uses resolved device font while retaining asset values', () => {
    expect(resolveElementPreviewFont({
      fontSource: 'system' as const,
      systemFont: 'FONT_SMALL',
      fontFamily: 'roboto-condensed-regular',
      fontSize: 36,
    }, {
      deviceId: 'venu3',
      partNumber: '006-B4260-00',
      locale: 'zh-CN',
    })).toMatchObject({
      fontFamily: 'Noto Sans SC',
      fontSize: 34,
      assetFontFamily: 'roboto-condensed-regular',
      assetFontSize: 36,
      fontSource: 'system',
      systemFont: 'FONT_SMALL',
    })
  })

  it('leaves asset fonts unchanged', () => {
    expect(resolveElementPreviewFont({ fontFamily: 'Inter', fontSize: 24 }, {
      deviceId: 'venu3', locale: 'en-US',
    })).toEqual({ fontFamily: 'Inter', fontSize: 24 })
  })

  it('refreshes only system-font canvas objects', () => {
    const systemObject = {
      fontSource: 'system' as const,
      systemFont: 'FONT_SMALL',
      assetFontFamily: 'Roboto',
      assetFontSize: 24,
      set: vi.fn(),
      initDimensions: vi.fn(),
      setCoords: vi.fn(),
    }
    const assetObject = { fontSource: 'asset' as const, set: vi.fn() }

    const changed = refreshGarminSystemFontPreviews([systemObject, assetObject], {
      deviceId: 'venu3',
      locale: 'zh-CN',
    })

    expect(changed).toBe(1)
    expect(systemObject.set).toHaveBeenCalledWith(expect.objectContaining({
      fontFamily: expect.any(String),
      fontSize: expect.any(Number),
      fontSource: 'system',
      systemFont: 'FONT_SMALL',
    }))
    expect(systemObject.initDimensions).toHaveBeenCalled()
    expect(systemObject.setCoords).toHaveBeenCalled()
    expect(assetObject.set).not.toHaveBeenCalled()
  })

  it('turns a system-font selection into an immediate Fabric preview update', () => {
    expect(resolveSystemFontUpdate({
      fontFamily: 'inter',
      fontSize: 36,
      fontSource: 'asset',
    }, {
      fontSource: 'system',
      systemFont: 'FONT_SMALL',
    }, {
      deviceId: 'venu3',
      partNumber: '006-B4260-00',
      locale: 'zh-CN',
    })).toMatchObject({
      fontSource: 'system',
      systemFont: 'FONT_SMALL',
      fontFamily: 'Noto Sans SC',
      fontSize: 34,
      assetFontFamily: 'inter',
      assetFontSize: 36,
    })
  })

  it('restores the retained asset font when leaving system-font mode', () => {
    expect(resolveSystemFontUpdate({
      fontFamily: 'Noto Sans SC',
      fontSize: 69,
      fontSource: 'system',
      systemFont: 'FONT_SMALL',
      assetFontFamily: 'inter',
      assetFontSize: 36,
    }, {
      fontSource: 'asset',
      systemFont: undefined,
    }, {
      deviceId: 'venu3',
      locale: 'zh-CN',
    })).toMatchObject({
      fontSource: 'asset',
      fontFamily: 'inter',
      fontSize: 36,
    })
  })
})
