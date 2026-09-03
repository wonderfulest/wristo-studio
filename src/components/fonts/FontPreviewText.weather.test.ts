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
    expect(preview.props('codepoints')).toEqual([34, 42, 48, 49, 50, 51, 52, 53, 54, 55, 64, 65, 66, 67])
    expect(wrapper.find('span.preview-text').exists()).toBe(false)
  })

  it('shows one Bluetooth state and one battery level in the ordinary icon fallback preview', () => {
    const wrapper = shallowMount(FontPreviewText, {
      props: { fontFamily: 'ordinary-icons', type: 'icon_font' },
    })

    expect(Array.from(wrapper.text(), character => character.codePointAt(0))).toEqual([
      0x22, 0x2a,
      0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37,
      0x40, 0x41, 0x42, 0x43,
    ])
  })

  it('uses the published BMFont assets and Chinese sample for Chinese text fonts', () => {
    const wrapper = shallowMount(FontPreviewText, {
      props: {
        fontFamily: 'noto-chinese-outline',
        type: 'text_font_zh',
        language: 'zh',
        fontUrl: '/source.ttf',
        bitmapPreviewDescriptorUrl: '/preview.fnt',
        bitmapPreviewAtlasUrl: '/preview.png',
      },
      global: { stubs: { BitmapFontPreview: true } },
    })

    const preview = wrapper.getComponent({ name: 'BitmapFontPreview' })
    expect(preview.props('descriptorUrl')).toBe('/preview.fnt')
    expect(preview.props('atlasUrl')).toBe('/preview.png')
    expect(preview.props('codepoints')).toEqual(Array.from('12:34 晴 25°C 周二 六月 农历五月十六', character => character.codePointAt(0)))
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
