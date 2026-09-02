// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LiveGlyphRasterPreview from './LiveGlyphRasterPreview.vue'

const putImageData = vi.fn()
const createImageData = vi.fn((width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }))

describe('LiveGlyphRasterPreview', () => {
  beforeEach(() => {
    putImageData.mockClear()
    createImageData.mockClear()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ createImageData, putImageData } as unknown as CanvasRenderingContext2D)
  })

  it('draws bottom-rendered RGBA pixels at their safe metric positions', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 128])
    const wrapper = mount(LiveGlyphRasterPreview, {
      props: {
        preview: {
          width: 17,
          lineHeight: 12,
          glyphs: [{ key: '79-0', codepoint: 79, left: 3, top: 2, width: 2, height: 1, rgba }],
        },
      },
    })

    expect(wrapper.get('[data-test="live-raster-preview"]').attributes('style')).toContain('width: 17px')
    const canvas = wrapper.get('canvas')
    expect(canvas.attributes()).toMatchObject({ width: '2', height: '1' })
    expect(canvas.attributes('style')).toContain('left: 3px')
    expect(canvas.attributes('style')).toContain('top: 2px')
    expect(putImageData).toHaveBeenCalledOnce()
    expect((putImageData.mock.calls[0][0] as ImageData).data).toEqual(rgba)
  })
})
