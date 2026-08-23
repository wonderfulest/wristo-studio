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
})
