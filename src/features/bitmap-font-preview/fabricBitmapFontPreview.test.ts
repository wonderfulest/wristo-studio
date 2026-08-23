// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { applyFabricBitmapFontPreview } from './fabricBitmapFontPreview'
import type { BmFontDescriptor } from './bmFontTextParser'

describe('Fabric BMFont preview', () => {
  it('draws published atlas glyphs instead of the source TTF renderer', async () => {
    const descriptor: BmFontDescriptor = {
      lineHeight: 32,
      base: 25,
      scaleW: 64,
      scaleH: 64,
      pageFile: 'demo.png',
      glyphs: new Map([
        [20013, { id: 20013, x: 2, y: 3, width: 12, height: 14, xoffset: 1, yoffset: 4, xadvance: 13, page: 0 }],
      ]),
      kernings: new Map(),
    }
    const originalRender = vi.fn()
    const object: any = {
      text: '中', width: 13, height: 32, fontSize: 64, fill: '#19a974', dirty: false,
      _renderText: originalRender,
      canvas: { requestRenderAll: vi.fn() },
    }
    const atlas = {} as CanvasImageSource

    await applyFabricBitmapFontPreview(object, {
      descriptorUrl: '/demo.fnt', atlasUrl: '/demo.png', sourceSize: 30,
    }, {
      loadDescriptor: async () => descriptor,
      loadAtlas: async () => atlas,
    })

    const renderContext = {
      drawImage: vi.fn(), fillRect: vi.fn(),
      globalCompositeOperation: 'source-over', fillStyle: '',
    } as unknown as CanvasRenderingContext2D
    vi.spyOn(document, 'createElement').mockReturnValue({ width: 0, height: 0, getContext: () => renderContext } as any)
    const context = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D
    object._renderText(context)

    expect(originalRender).not.toHaveBeenCalled()
    expect(renderContext.drawImage).toHaveBeenCalledWith(atlas, 2, 3, 12, 14, expect.any(Number), expect.any(Number), 25.6, expect.any(Number))
    expect(renderContext.fillRect).toHaveBeenCalled()
    expect(context.drawImage).toHaveBeenCalledOnce()
    expect(object.dirty).toBe(true)
    expect(object.canvas.requestRenderAll).toHaveBeenCalled()
  })

  it('never falls back to the source TTF renderer in bitmap-only mode', async () => {
    const descriptor: BmFontDescriptor = {
      lineHeight: 32,
      base: 25,
      scaleW: 64,
      scaleH: 64,
      pageFile: 'icons.png',
      glyphs: new Map(),
      kernings: new Map(),
    }
    const originalRender = vi.fn()
    const object: any = {
      text: 'g', fontSize: 30, fill: '#fff',
      _renderText: originalRender,
    }
    let releaseDescriptor!: (descriptor: BmFontDescriptor) => void
    const descriptorPending = new Promise<BmFontDescriptor>((resolve) => {
      releaseDescriptor = resolve
    })
    const pending = applyFabricBitmapFontPreview(object, {
      descriptorUrl: '/icons.fnt', atlasUrl: '/icons.png', sourceSize: 30,
    }, {
      loadDescriptor: () => descriptorPending,
      loadAtlas: async () => ({} as CanvasImageSource),
    }, { fallbackToText: false })

    object._renderText({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)
    expect(originalRender).not.toHaveBeenCalled()

    releaseDescriptor(descriptor)
    await pending
    object._renderText({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)
    expect(originalRender).not.toHaveBeenCalled()
  })

  it('updates the tint without reloading unchanged preview assets', async () => {
    const descriptor: BmFontDescriptor = {
      lineHeight: 30,
      base: 24,
      scaleW: 32,
      scaleH: 32,
      pageFile: 'demo.png',
      glyphs: new Map([
        [65, { id: 65, x: 0, y: 0, width: 10, height: 12, xoffset: 0, yoffset: 3, xadvance: 11, page: 0 }],
      ]),
      kernings: new Map(),
    }
    const loadDescriptor = vi.fn(async () => descriptor)
    const loadAtlas = vi.fn(async () => ({} as CanvasImageSource))
    const object: any = {
      text: 'A', fontSize: 30, fill: '#fff',
      _renderText: vi.fn(),
    }
    const assets = { descriptorUrl: '/demo.fnt', atlasUrl: '/demo.png', sourceSize: 30 }

    await applyFabricBitmapFontPreview(object, { ...assets, color: '#f00' }, { loadDescriptor, loadAtlas })
    await applyFabricBitmapFontPreview(object, { ...assets, color: '#0af' }, { loadDescriptor, loadAtlas })
    const renderContext = {
      drawImage: vi.fn(), fillRect: vi.fn(),
      globalCompositeOperation: 'source-over', fillStyle: '',
    } as unknown as CanvasRenderingContext2D
    vi.spyOn(document, 'createElement').mockReturnValue({ width: 0, height: 0, getContext: () => renderContext } as any)
    const context = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D
    object._renderText(context)

    expect(renderContext.fillStyle).toBe('#0af')
    expect(loadDescriptor).toHaveBeenCalledOnce()
    expect(loadAtlas).toHaveBeenCalledOnce()
  })

  it('falls back to the legacy 30px atlas when a high-resolution canvas preview is unavailable', async () => {
    const descriptor: BmFontDescriptor = {
      lineHeight: 30,
      base: 24,
      scaleW: 32,
      scaleH: 32,
      pageFile: 'demo.png',
      glyphs: new Map([
        [65, { id: 65, x: 0, y: 0, width: 10, height: 12, xoffset: 0, yoffset: 3, xadvance: 11, page: 0 }],
      ]),
      kernings: new Map(),
    }
    const loadDescriptor = vi.fn(async (url: string) => {
      if (url.includes('/312/')) throw new Error('high-resolution preview not published')
      return descriptor
    })
    const loadAtlas = vi.fn(async () => ({} as CanvasImageSource))
    const object: any = {
      text: 'A', fontSize: 60, fill: '#fff', dirty: false,
      _renderText: vi.fn(),
      canvas: { requestRenderAll: vi.fn() },
    }

    await applyFabricBitmapFontPreview(object, {
      descriptorUrl: '/312/demo.fnt',
      atlasUrl: '/312/demo.png',
      sourceSize: 312,
      fallback: {
        descriptorUrl: '/30/demo.fnt',
        atlasUrl: '/30/demo.png',
        sourceSize: 30,
      },
    }, { loadDescriptor, loadAtlas })

    expect(loadDescriptor).toHaveBeenNthCalledWith(1, '/312/demo.fnt')
    expect(loadDescriptor).toHaveBeenNthCalledWith(2, '/30/demo.fnt')
    expect(object.dirty).toBe(true)
    expect(object.canvas.requestRenderAll).toHaveBeenCalled()
  })

  it('drops stale glyph assets and retries after both variants of a newly selected font fail', async () => {
    const descriptor = (id: number): BmFontDescriptor => ({
      lineHeight: 30,
      base: 24,
      scaleW: 32,
      scaleH: 32,
      pageFile: `${id}.png`,
      glyphs: new Map([
        [id, { id, x: 0, y: 0, width: 10, height: 12, xoffset: 0, yoffset: 3, xadvance: 11, page: 0 }],
      ]),
      kernings: new Map(),
    })
    let fontBAvailable = false
    const loadDescriptor = vi.fn(async (url: string) => {
      if (url.includes('/b/') && !fontBAvailable) throw new Error('font B unavailable')
      return descriptor(url.includes('/b/') ? 66 : 65)
    })
    const loadAtlas = vi.fn(async (url: string) => {
      if (url.includes('/b/') && !fontBAvailable) throw new Error('font B unavailable')
      return { url } as unknown as CanvasImageSource
    })
    const originalRender = vi.fn()
    const object: any = { text: 'A', fontSize: 30, fill: '#fff', _renderText: originalRender }
    const fontA = { descriptorUrl: '/a/312/demo.fnt', atlasUrl: '/a/312/demo.png', sourceSize: 312 }
    const fontB = {
      descriptorUrl: '/b/312/demo.fnt', atlasUrl: '/b/312/demo.png', sourceSize: 312,
      fallback: { descriptorUrl: '/b/30/demo.fnt', atlasUrl: '/b/30/demo.png', sourceSize: 30 },
    }

    await applyFabricBitmapFontPreview(object, fontA, { loadDescriptor, loadAtlas })
    await expect(applyFabricBitmapFontPreview(object, fontB, { loadDescriptor, loadAtlas })).rejects.toThrow('font B unavailable')

    const context = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D
    object._renderText(context)
    expect(originalRender).toHaveBeenCalledOnce()

    fontBAvailable = true
    object.text = 'B'
    await applyFabricBitmapFontPreview(object, fontB, { loadDescriptor, loadAtlas })

    expect(loadDescriptor).toHaveBeenCalledWith('/b/312/demo.fnt')
    expect(loadDescriptor.mock.calls.filter(([url]) => url === '/b/312/demo.fnt')).toHaveLength(2)
  })

  it('renders at the Fabric zoom and retina density before drawing at logical size', async () => {
    const descriptor: BmFontDescriptor = {
      lineHeight: 312,
      base: 250,
      scaleW: 512,
      scaleH: 512,
      pageFile: 'demo.png',
      glyphs: new Map([
        [65, { id: 65, x: 0, y: 0, width: 100, height: 120, xoffset: 0, yoffset: 30, xadvance: 100, page: 0 }],
      ]),
      kernings: new Map(),
    }
    const object: any = {
      text: 'A', fontSize: 30, fill: '#fff',
      getTotalObjectScaling: () => ({ x: 2, y: 1.5 }),
      _renderText: vi.fn(),
    }
    await applyFabricBitmapFontPreview(object, {
      descriptorUrl: '/312/demo.fnt', atlasUrl: '/312/demo.png', sourceSize: 312,
    }, {
      loadDescriptor: async () => descriptor,
      loadAtlas: async () => ({} as CanvasImageSource),
    })
    const renderContext = {
      drawImage: vi.fn(), fillRect: vi.fn(),
      globalCompositeOperation: 'source-over', fillStyle: '',
    } as unknown as CanvasRenderingContext2D
    const renderCanvas = { width: 0, height: 0, getContext: () => renderContext } as any
    vi.spyOn(document, 'createElement').mockReturnValue(renderCanvas)
    const context = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D

    object._renderText(context)

    expect(renderCanvas.width).toBe(20)
    expect(renderCanvas.height).toBe(60)
    expect(context.drawImage).toHaveBeenCalledWith(renderCanvas, -5, -15, 10, 30)
  })

  it('uses the rounded canvas dimensions as the exact density at fractional zoom', async () => {
    const descriptor: BmFontDescriptor = {
      lineHeight: 312,
      base: 250,
      scaleW: 512,
      scaleH: 512,
      pageFile: 'demo.png',
      glyphs: new Map([
        [65, { id: 65, x: 0, y: 0, width: 104, height: 312, xoffset: 0, yoffset: 0, xadvance: 104, page: 0 }],
      ]),
      kernings: new Map(),
    }
    const object: any = {
      text: 'A', fontSize: 30, fill: '#fff',
      getTotalObjectScaling: () => ({ x: 1.25, y: 1.25 }),
      _renderText: vi.fn(),
    }
    await applyFabricBitmapFontPreview(object, {
      descriptorUrl: '/312/demo.fnt', atlasUrl: '/312/demo.png', sourceSize: 312,
    }, {
      loadDescriptor: async () => descriptor,
      loadAtlas: async () => ({} as CanvasImageSource),
    })
    const renderContext = {
      drawImage: vi.fn(), fillRect: vi.fn(),
      globalCompositeOperation: 'source-over', fillStyle: '',
    } as unknown as CanvasRenderingContext2D
    const renderCanvas = { width: 0, height: 0, getContext: () => renderContext } as any
    vi.spyOn(document, 'createElement').mockReturnValue(renderCanvas)

    object._renderText({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)

    expect(renderCanvas.width).toBe(13)
    expect(renderCanvas.height).toBe(38)
    expect(renderContext.drawImage).toHaveBeenCalledWith(
      expect.anything(), 0, 0, 104, 312, 0, 0, 13, 38,
    )
  })
})
