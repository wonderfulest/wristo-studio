import { describe, expect, it, vi } from 'vitest'
import { refreshGarminSystemFontPreviews, resolveElementPreviewFont } from './useGarminSystemFont'

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
      fontSize: 69,
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
})
