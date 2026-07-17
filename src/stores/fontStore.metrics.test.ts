// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { cache } from 'fabric'
import { useCanvasStore } from './canvasStore'
import { useFontStore } from './fontStore'

vi.mock('@/api/wristo/fonts', () => ({
  getFontBySlug: vi.fn(),
  getSystemFonts: vi.fn(),
  getRecentFonts: vi.fn(),
}))

class TestFontFace {
  constructor(
    public family: string,
    public source: string,
  ) {}

  async load() {
    return this
  }
}

describe('font metrics refresh', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    ;(globalThis as any).FontFace = TestFontFace
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        add: vi.fn(),
        load: vi.fn().mockResolvedValue([]),
        ready: Promise.resolve(),
        check: vi.fn().mockReturnValue(true),
      },
    })
  })

  it('clears cached widths and recalculates matching Fabric text after a font loads', async () => {
    const matchingText = {
      fontFamily: 'large-time-font',
      dirty: false,
      initDimensions: vi.fn(),
      setCoords: vi.fn(),
    }
    const otherText = {
      fontFamily: 'other-font',
      initDimensions: vi.fn(),
      setCoords: vi.fn(),
    }
    const requestRenderAll = vi.fn()
    const canvasStore = useCanvasStore()
    ;(canvasStore as any).canvas = {
      getObjects: () => [matchingText, otherText],
      requestRenderAll,
    }
    const clearFontCache = vi.spyOn(cache, 'clearFontCache')

    await expect(
      useFontStore().loadFont('large-time-font', 'data:font/ttf;base64,AA=='),
    ).resolves.toBe(true)

    expect(clearFontCache).toHaveBeenCalledWith('large-time-font')
    expect(matchingText.initDimensions).toHaveBeenCalledOnce()
    expect(matchingText.setCoords).toHaveBeenCalledOnce()
    expect(matchingText.dirty).toBe(true)
    expect(otherText.initDimensions).not.toHaveBeenCalled()
    expect(requestRenderAll).toHaveBeenCalledOnce()
  })
})
