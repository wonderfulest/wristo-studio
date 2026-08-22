// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BitmapFontPreview from './BitmapFontPreview.vue'

const descriptor = `info face="demo" size=30
common lineHeight=32 base=25 scaleW=128 scaleH=64 pages=1 packed=0
page id=0 file="demo-g_0.png"
chars count=2
char id=48 x=1 y=2 width=10 height=12 xoffset=-1 yoffset=3 xadvance=11 page=0 chnl=15
char id=49 x=13 y=2 width=8 height=12 xoffset=0 yoffset=3 xadvance=9 page=0 chnl=15
kernings count=1
kerning first=48 second=49 amount=-2`

describe('BitmapFontPreview', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('renders glyph crops with the descriptor offsets and kerning', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(descriptor) })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(BitmapFontPreview, {
      props: {
        descriptorUrl: 'https://cdn.example/preview/demo-g.fnt',
        atlasUrl: 'https://cdn.example/preview/demo-g_0.png',
        codepoints: [48, 49],
      },
    })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example/preview/demo-g.fnt', { credentials: 'omit' })
    const glyphs = wrapper.findAll('[data-bmfont-glyph]')
    expect(glyphs).toHaveLength(2)
    expect(glyphs[0].attributes('style')).toContain('left: -1px')
    expect(glyphs[0].attributes('style')).toContain('mask-position: -1px -2px')
    expect(glyphs[1].attributes('style')).toContain('left: 9px')
    expect(wrapper.get('[data-bmfont-preview]').attributes('style')).toContain('width: 18px')
  })

  it('shows no substitute TTF rendering when a published preview is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('invalid') }))
    const wrapper = mount(BitmapFontPreview, {
      props: { descriptorUrl: '/bad.fnt', atlasUrl: '/atlas.png', codepoints: [48] },
    })
    await flushPromises()

    expect(wrapper.find('[data-bmfont-preview-error]').exists()).toBe(true)
    expect(wrapper.find('[data-bmfont-glyph]').exists()).toBe(false)
  })
})
