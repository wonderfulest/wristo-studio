// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { cache } from 'fabric'
import { useCanvasStore } from './canvasStore'
import { useFontStore } from './fontStore'
import { getFontBySlug } from '@/api/wristo/fonts'

const bitmapRecipe = {
  schemaVersion: 1 as const,
  rendererVersion: '1' as const,
  fontWeight: 700,
  italicAngle: -12,
  outlineWidthEm: 0.04,
  outlineMode: 'outline-only' as const,
  lineJoin: 'round' as const,
  antialias: true as const
}

vi.mock('@/api/wristo/fonts', () => ({
  getFontBySlug: vi.fn(),
  getSystemFonts: vi.fn(),
  getRecentFonts: vi.fn()
}))

class TestFontFace {
  constructor(
    public family: string,
    public source: string
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
        check: vi.fn().mockReturnValue(true)
      }
    })
  })

  it('clears cached widths and recalculates matching Fabric text after a font loads', async () => {
    const matchingText = {
      fontFamily: 'large-time-font',
      dirty: false,
      initDimensions: vi.fn(),
      setCoords: vi.fn()
    }
    const otherText = {
      fontFamily: 'other-font',
      initDimensions: vi.fn(),
      setCoords: vi.fn()
    }
    const requestRenderAll = vi.fn()
    const canvasStore = useCanvasStore()
    ;(canvasStore as any).canvas = {
      getObjects: () => [matchingText, otherText],
      requestRenderAll
    }
    const clearFontCache = vi.spyOn(cache, 'clearFontCache')

    await expect(useFontStore().loadFont('large-time-font', 'data:font/ttf;base64,AA==')).resolves.toBe(true)

    expect(clearFontCache).toHaveBeenCalledWith('large-time-font')
    expect(matchingText.initDimensions).toHaveBeenCalledOnce()
    expect(matchingText.setCoords).toHaveBeenCalledOnce()
    expect(matchingText.dirty).toBe(true)
    expect(otherText.initDimensions).not.toHaveBeenCalled()
    expect(requestRenderAll).toHaveBeenCalledOnce()
  })

  it('stores and normalizes server metadata before refreshing matching objects', async () => {
    const matchingText: any = {
      fontFamily: 'outlined-time',
      fontSize: 50,
      fill: '#12abef',
      fontWeight: 400,
      skewX: 0,
      stroke: undefined,
      strokeWidth: 0,
      initDimensions: vi.fn(),
      setCoords: vi.fn(),
      set(props: Record<string, unknown>) {
        Object.assign(this, props)
      }
    }
    const requestRenderAll = vi.fn()
    ;(useCanvasStore() as any).canvas = { getObjects: () => [matchingText], requestRenderAll }
    vi.mocked(getFontBySlug).mockResolvedValue({
      data: {
        slug: 'outlined-time',
        type: 'number_font',
        ttfFile: { url: 'data:font/ttf;base64,AA==' },
        bitmapRecipe: JSON.stringify(bitmapRecipe)
      }
    } as any)

    await expect(useFontStore().loadFont('outlined-time')).resolves.toBe(true)

    expect(useFontStore().serverFonts.get('outlined-time')?.bitmapRecipe).toEqual(bitmapRecipe)
    expect(matchingText).toMatchObject({
      fill: 'rgba(0,0,0,0)',
      stroke: '#12abef',
      strokeWidth: 2,
      fontWeight: 700,
      skewX: -12,
      dirty: true
    })
    expect(matchingText.initDimensions).toHaveBeenCalledOnce()
    expect(requestRenderAll).toHaveBeenCalledOnce()
  })

  it('applies registered recipe metadata when the font is loaded with a direct URL', async () => {
    const matchingText: any = {
      fontFamily: 'direct-styled', fontSize: 50, fill: '#fff', fontWeight: 400, skewX: 0,
      initDimensions: vi.fn(), setCoords: vi.fn(), set(props: any) { Object.assign(this, props) },
    }
    ;(useCanvasStore() as any).canvas = { getObjects: () => [matchingText], requestRenderAll: vi.fn() }
    const store = useFontStore()

    store.registerServerFont({ slug: 'direct-styled', bitmapRecipe: JSON.stringify(bitmapRecipe) } as any)
    await expect(store.loadFont('direct-styled', 'data:font/ttf;base64,AA==')).resolves.toBe(true)

    expect(matchingText).toMatchObject({ fontWeight: 700, skewX: -12, strokeWidth: 2 })
  })

  it('removes stale recipe display props when refreshed metadata has no recipe', async () => {
    const matchingText: any = {
      fontFamily: 'plain-time',
      fontSize: 48,
      fill: '#fff',
      fontWeight: 500,
      skewX: 3,
      stroke: '#ccc',
      strokeWidth: 2,
      strokeLineJoin: 'bevel',
      initDimensions: vi.fn(),
      setCoords: vi.fn(),
      set(props: Record<string, unknown>) {
        Object.assign(this, props)
      }
    }
    const canvas = { getObjects: () => [matchingText], requestRenderAll: vi.fn() }
    ;(useCanvasStore() as any).canvas = canvas
    const store = useFontStore()
    store.serverFonts.set('plain-time', { slug: 'plain-time', bitmapRecipe } as any)
    const { applyRecipePreviewToFabricObject } = await import('@/features/bitmap-font-maker/recipePreview')
    applyRecipePreviewToFabricObject(matchingText, bitmapRecipe, 48, '#fff')
    store.serverFonts.set('plain-time', { slug: 'plain-time', bitmapRecipe: null } as any)

    await store.refreshFontPreview('plain-time')

    expect(matchingText).toMatchObject({ fill: '#fff', fontWeight: 500, skewX: 3, stroke: '#ccc', strokeWidth: 2 })
  })

  it('refreshes radial child text even when the matching group has no initDimensions', async () => {
    const child: any = {
      fontFamily: 'radial-recipe',
      fontSize: 50,
      fill: '#bada55',
      fontWeight: 400,
      skewX: 0,
      strokeWidth: 0,
      initDimensions: vi.fn(),
      setCoords: vi.fn(),
      set(props: Record<string, unknown>) {
        Object.assign(this, props)
      }
    }
    const group: any = {
      fontFamily: 'radial-recipe',
      fontSize: 50,
      fill: '#bada55',
      _objects: [child],
      updateRadialLayout: vi.fn(),
      setCoords: vi.fn(),
      set(props: Record<string, unknown>) {
        Object.assign(this, props)
      }
    }
    const canvas = { getObjects: () => [group], requestRenderAll: vi.fn() }
    ;(useCanvasStore() as any).canvas = canvas
    const store = useFontStore()
    store.serverFonts.set('radial-recipe', { slug: 'radial-recipe', bitmapRecipe } as any)

    await store.refreshFontPreview('radial-recipe')

    expect(child).toMatchObject({ fill: 'rgba(0,0,0,0)', stroke: '#bada55', strokeWidth: 2 })
    expect(child.initDimensions).toHaveBeenCalledOnce()
    expect(group.updateRadialLayout).toHaveBeenCalledOnce()
    expect(group.setCoords).toHaveBeenCalledOnce()
    expect(canvas.requestRenderAll).toHaveBeenCalledOnce()
  })

  it('recursively refreshes matching nested text and relayouts only changed ancestor groups', async () => {
    const matching: any = {
      fontFamily: '  Mixed-Case-Slug ', fontSize: 50, fill: '#fff',
      initDimensions: vi.fn(), setCoords: vi.fn(),
      set(props: any) { Object.assign(this, props) },
    }
    const other: any = { fontFamily: 'other', initDimensions: vi.fn(), setCoords: vi.fn() }
    const inner: any = { fontFamily: 'group-font', _objects: [matching, other], updateRadialLayout: vi.fn(), setCoords: vi.fn() }
    const outer: any = { fontFamily: 'unrelated-root', _objects: [inner], updateRadialLayout: vi.fn(), setCoords: vi.fn() }
    outer._objects.push(outer)
    const canvas = { getObjects: () => [outer], requestRenderAll: vi.fn() }
    ;(useCanvasStore() as any).canvas = canvas
    const store = useFontStore()
    store.serverFonts.set('mixed-case-slug', { slug: 'Mixed-Case-Slug', bitmapRecipe } as any)

    await store.refreshFontPreview(' MIXED-CASE-SLUG ')

    expect(matching.strokeWidth).toBe(2)
    expect(other.initDimensions).not.toHaveBeenCalled()
    expect(inner.updateRadialLayout).toHaveBeenCalledOnce()
    expect(outer.updateRadialLayout).toHaveBeenCalledOnce()
    expect(canvas.requestRenderAll).toHaveBeenCalledOnce()
  })
})
