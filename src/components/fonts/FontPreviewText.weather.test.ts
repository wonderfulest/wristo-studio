// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import FontPreviewText from './FontPreviewText.vue'

const glyph = (code: string) => String.fromCodePoint(parseInt(code, 16))

describe('font preview icon type separation', () => {
  it('uses the published BMFont assets instead of TTF text for managed icon fonts', () => {
    const wrapper = shallowMount(FontPreviewText, {
      props: {
        fontFamily: 'ordinary-icons',
        type: 'icon_font',
        fontUrl: '/stale.ttf',
        bitmapPreviewDescriptorUrl: '/preview.fnt',
        bitmapPreviewAtlasUrl: '/preview.png',
      },
      global: { stubs: { BitmapFontPreview: true } },
    })

    const preview = wrapper.getComponent({ name: 'BitmapFontPreview' })
    expect(preview.props('descriptorUrl')).toBe('/preview.fnt')
    expect(preview.props('atlasUrl')).toBe('/preview.png')
    expect(preview.props('codepoints')).toEqual([48, 49, 50, 51, 52, 53, 54, 55, 64, 65, 66, 67])
    expect(wrapper.find('span.preview-text').exists()).toBe(false)
  })

  it('does not preview weather glyphs in an ordinary icon font', () => {
    const wrapper = shallowMount(FontPreviewText, {
      props: { fontFamily: 'ordinary-icons', type: 'icon_font' },
    })

    expect(wrapper.text()).not.toContain(glyph('101d'))
    expect(wrapper.get('.preview-text').classes()).toContain('preview-text-icon')
  })

  it('previews all standard weather glyphs for a weather font', () => {
    const wrapper = shallowMount(FontPreviewText, {
      props: { fontFamily: 'weather-icons', type: 'weather_font' },
    })

    for (const code of [
      '101d', '101e', '102d', '102e', '103d', '104d',
      '109d', '110d', '110e', '111d', '113d', '150d',
    ]) {
      expect(wrapper.text()).toContain(glyph(code))
    }
    expect(wrapper.get('.preview-text').classes()).toContain('preview-text-icon')
  })
})
