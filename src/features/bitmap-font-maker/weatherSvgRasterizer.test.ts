import { describe, expect, it, vi } from 'vitest'
import { fitWeatherGlyphBounds, findAlphaBounds, prepareWeatherRasterSvg, rasterizeWeatherSvgSources } from './weatherSvgRasterizer'

describe('weather SVG rasterizer geometry', () => {
  it('finds the non-transparent source bounds', () => {
    const alpha = new Uint8ClampedArray([0, 0, 0, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 0, 0, 0])
    expect(findAlphaBounds(alpha, 4, 4)).toEqual({ x: 1, y: 1, width: 2, height: 2 })
  })

  it('fits a cropped glyph into a centered square font cell', () => {
    expect(fitWeatherGlyphBounds({ x: 2, y: 3, width: 8, height: 4 }, 20, 0.8)).toEqual({
      width: 16,
      height: 8,
      xoffset: 2,
      yoffset: 6,
      xadvance: 20
    })
  })

  it('keeps an empty SVG as a zero-size glyph with a stable advance', () => {
    expect(findAlphaBounds(new Uint8ClampedArray(16), 4, 4)).toBeUndefined()
    expect(fitWeatherGlyphBounds(undefined, 12, 0.88)).toEqual({
      width: 0,
      height: 0,
      xoffset: 6,
      yoffset: 6,
      xadvance: 12
    })
  })

  it('removes XML and doctype prologs before browser image decoding', () => {
    const prepared = prepareWeatherRasterSvg('<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg width="200" height="200" viewBox="0 0 1024 1024"><path/></svg>')

    expect(prepared).toMatch(/^<svg\b/)
    expect(prepared).not.toContain('<?xml')
    expect(prepared).not.toContain('<!DOCTYPE')
    expect(prepared).toContain('width="1024" height="1024"')
  })

  it('does not duplicate preserveAspectRatio while preparing an SVG for browser decoding', () => {
    const prepared = prepareWeatherRasterSvg('<svg width="1024" height="1024" viewBox="0 0 1024 1024" preserveAspectRatio="xMidYMid meet"><path/></svg>')

    expect(prepared.match(/\bpreserveAspectRatio\s*=/g)).toHaveLength(1)
  })

  it('uses prepared alpha pixels without sending the SVG blob through createImageBitmap', async () => {
    const resizeAlpha = vi.fn(() => new Uint8ClampedArray(16 * 16).fill(255))
    const result = await rasterizeWeatherSvgSources(
      [
        {
          iconUnicode: '101d',
          fileName: '101d.svg',
          svg: '<svg></svg>',
          raster: {
            width: 4,
            height: 4,
            alpha: new Uint8ClampedArray([0, 0, 0, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 0, 0, 0])
          }
        }
      ],
      20,
      { schemaVersion: 1, rendererVersion: '1', contentScale: 0.8, antialias: true },
      {
        createCanvas: vi.fn(() => {
          throw new Error('canvas fallback should not run')
        }),
        createBitmap: vi.fn(async () => {
          throw new Error('SVG blob decoder should not run')
        }),
        resizeAlpha
      }
    )

    expect(result.glyphs[0]).toMatchObject({
      codepoint: Number.parseInt('101d', 16),
      width: 16,
      height: 16,
      xoffset: 2,
      yoffset: 2,
      xadvance: 20
    })
    expect(result.glyphs[0].alpha).toHaveLength(16 * 16)
    expect(resizeAlpha).toHaveBeenCalledOnce()
  })
})
