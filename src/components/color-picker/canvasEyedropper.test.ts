import { describe, expect, it, vi } from 'vitest'
import { getCanvasPixelPoint, pixelToVisibleColor, sampleCanvasColor } from './canvasEyedropper'

describe('canvas eyedropper pixel sampling', () => {
  it('maps viewport coordinates to backing canvas pixels at the current zoom', () => {
    expect(
      getCanvasPixelPoint(
        { width: 200, height: 100 },
        { left: 10, top: 20, width: 100, height: 50 },
        35,
        30,
      ),
    ).toEqual({ x: 50, y: 20 })
  })

  it('clamps the sampled pixel to the canvas bounds', () => {
    expect(
      getCanvasPixelPoint(
        { width: 200, height: 100 },
        { left: 10, top: 20, width: 100, height: 50 },
        110,
        70,
      ),
    ).toEqual({ x: 199, y: 99 })
  })

  it('returns transparent only for a fully transparent rendered pixel', () => {
    expect(pixelToVisibleColor(new Uint8ClampedArray([120, 80, 40, 0]))).toBe('transparent')
  })

  it('composites a translucent rendered pixel over the visible black canvas backdrop', () => {
    expect(pixelToVisibleColor(new Uint8ClampedArray([255, 128, 0, 128]))).toBe('#804000')
  })

  it('samples the mapped pixel from the final render canvas', () => {
    const getImageData = vi.fn(() => ({ data: new Uint8ClampedArray([18, 52, 86, 255]) }))
    const canvas = {
      width: 200,
      height: 100,
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 100, height: 50 }),
      getContext: () => ({ getImageData }),
    } as unknown as HTMLCanvasElement

    expect(sampleCanvasColor(canvas, 35, 30)).toEqual({ color: '#123456', point: { x: 50, y: 20 } })
    expect(getImageData).toHaveBeenCalledWith(50, 20, 1, 1)
  })
})
