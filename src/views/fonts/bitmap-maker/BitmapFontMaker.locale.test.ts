// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useLocaleStore } from '@/stores/locale'
import BitmapFontMaker from './BitmapFontMaker.vue'

vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('./TtfBitmapFontMaker.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../icons/IconLibrary.vue', () => ({ default: { template: '<div />' } }))

describe('bitmap maker directory language', () => {
  it('updates all directory copy when switching Chinese to English and back', async () => {
    setActivePinia(createPinia())
    const locale = useLocaleStore()
    locale.setLocale('zh')
    const wrapper = mount(BitmapFontMaker)
    expect(wrapper.get('h1').text()).toBe('位图字体生成器')
    locale.setLocale('en')
    await nextTick()
    expect(wrapper.get('h1').text()).toBe('Bitmap Font Generators')
    expect(wrapper.get('.maker-directory').text()).not.toMatch(/[\u3400-\u9fff]/)
    expect(wrapper.get('[role="tablist"]').attributes('aria-label')).toBe('Bitmap font source')
    expect(wrapper.findAll('[role="tab"]').map(tab => tab.text())).toEqual([
      'TTF / OTF FontsGenerate bitmap fonts for numbers, English, or Chinese from font files',
      'SVG LibraryGenerate bitmap fonts from icon or weather SVG libraries',
    ])
    locale.setLocale('zh')
    await nextTick()
    expect(wrapper.get('h1').text()).toBe('位图字体生成器')
    expect(wrapper.findAll('[role="tab"]')[0].text()).toContain('TTF / OTF 字体')
    wrapper.unmount()
  })
})
