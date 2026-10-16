// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import BitmapFontList from './BitmapFontList.vue'

vi.mock('@/stores/user', () => ({ useUserStore: () => ({ userInfo: null }) }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/api/wristo/bitmapFont', () => ({
  listBitmapFontChars: vi.fn().mockResolvedValue({ data: [
    { charValue: '0', image: { url: '/original-glyph.png' } },
  ] }),
}))

describe('bitmap font preview background', () => {
  it('switches backgrounds without selecting a font or replacing its artwork', async () => {
    const wrapper = mount(BitmapFontList, {
      props: { fonts: [{ id: 1, fontName: 'Original' }], activeId: null, pageNum: 1, pageSize: 20, total: 1 },
      global: { stubs: { 'el-tooltip': { template: '<slot />' }, 'el-icon': true } },
    })
    await flushPromises()
    const list = wrapper.get('.bitmap-font-list')
    const buttons = wrapper.findAll('.preview-background-controls button')
    expect(list.attributes('data-preview-background')).toBe('checkerboard')
    for (const [index, background] of ['dark', 'light', 'checkerboard'].entries()) {
      await buttons[index].trigger('click')
      expect(list.attributes('data-preview-background')).toBe(background)
      expect(buttons[index].attributes('aria-pressed')).toBe('true')
      expect(buttons.filter(button => button.attributes('aria-pressed') === 'true')).toHaveLength(1)
      expect(wrapper.get('.glyph-img').attributes('src')).toBe('/original-glyph.png')
      expect(wrapper.emitted('select')).toBeUndefined()
    }
    await wrapper.get('.info').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual([{ id: 1, fontName: 'Original' }])
    wrapper.unmount()
  })
})
