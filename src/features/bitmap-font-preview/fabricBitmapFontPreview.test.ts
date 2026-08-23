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

    const context = {
      save: vi.fn(), restore: vi.fn(), drawImage: vi.fn(), fillRect: vi.fn(),
      globalCompositeOperation: 'source-over', fillStyle: '',
    } as unknown as CanvasRenderingContext2D
    object._renderText(context)

    expect(originalRender).not.toHaveBeenCalled()
    expect(context.drawImage).toHaveBeenCalledWith(atlas, 2, 3, 12, 14, expect.any(Number), expect.any(Number), 25.6, expect.any(Number))
    expect(context.fillRect).toHaveBeenCalled()
    expect(object.dirty).toBe(true)
    expect(object.canvas.requestRenderAll).toHaveBeenCalled()
  })
})
