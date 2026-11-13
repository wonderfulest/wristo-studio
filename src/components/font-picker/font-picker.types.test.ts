// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount as mountComponent, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import FontPicker from './font-picker.vue'
import { FontTypes } from '@/config/fonts'
import { useFontStore } from '@/stores/fontStore'
import { useUserStore } from '@/stores/user'
import { useDesignStore } from '@/stores/designStore'

const wrappers: VueWrapper[] = []
const mount = ((...args: Parameters<typeof mountComponent>) => {
  const wrapper = mountComponent(...args)
  wrappers.push(wrapper)
  return wrapper
}) as typeof mountComponent
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()) })

vi.mock('opentype.js', () => ({ default: {}, parse: vi.fn() }))
vi.mock('@/api/wristo/fonts', () => ({
  getFontBySlug: vi.fn().mockResolvedValue({ data: null }),
  getFontStyleTags: vi.fn().mockResolvedValue({ data: [] }),
  getSystemFonts: vi.fn().mockResolvedValue({ data: [] }),
  getRecentFonts: vi.fn().mockResolvedValue({ data: [] }),
  updateMyFontSearchIndex: vi.fn(),
}))

const childStub = (name: string, className: string) => ({
  name,
  props: ['types', 'dateContentLanguage'],
  template: `<div class="${className}" />`,
})

describe('font picker multi-type queries', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('propagates allowed types and refreshes recent fonts whenever the picker reopens', async () => {
    const fontStore = useFontStore()
    fontStore.fetchFonts = vi.fn().mockResolvedValue(undefined)
    const initBuiltinFonts = vi.spyOn(fontStore, 'initBuiltinFontsFromSystem').mockResolvedValue(undefined)
    const initRecentFonts = vi.spyOn(fontStore, 'initRecentFonts').mockResolvedValue(undefined)
    useUserStore().setUserInfo({ roles: [{ roleCode: 'ROLE_ADMIN' }] } as any)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/fonts', component: { template: '<div />' } },
      ],
    })
    const FontSearchStub = childStub('FontSearch', 'font-search-stub')
    const RecentFontListStub = childStub('RecentFontList', 'recent-font-list-stub')
    const DesignerFontListStub = childStub('DesignerFontList', 'designer-font-list-stub')
    const wrapper = mount(FontPicker, {
      props: {
        modelValue: 'clock-font',
        type: FontTypes.TIME_FONT,
        types: [FontTypes.TIME_FONT, FontTypes.TEXT_FONT],
      },
      global: {
        plugins: [router],
        stubs: {
          Teleport: true,
          FontPreviewText: true,
          FontSearch: FontSearchStub,
          RecentFontList: RecentFontListStub,
          DesignerFontList: DesignerFontListStub,
          FontImportDialog: true,
          NumberGlyphEditorDialog: true,
          'el-icon': true,
          'el-segmented': true,
          'el-form-item': true,
          'el-option': true,
          'el-select': true,
          'el-input': true,
          'el-switch': true,
          'el-form': true,
          'el-button': true,
          'el-dialog': true,
        },
      },
    })

    await wrapper.get('.font-preview').trigger('click')
    expect(wrapper.getComponent(FontSearchStub).props('types')).toEqual([
      FontTypes.TIME_FONT,
      FontTypes.TEXT_FONT,
    ])
    expect(wrapper.getComponent(RecentFontListStub).props('types')).toEqual([
      FontTypes.TIME_FONT,
      FontTypes.TEXT_FONT,
    ])
    expect(wrapper.getComponent(DesignerFontListStub).props('types')).toEqual([
      FontTypes.TIME_FONT,
      FontTypes.TEXT_FONT,
    ])
    expect(initRecentFonts).toHaveBeenLastCalledWith(
      undefined,
      [FontTypes.TIME_FONT, FontTypes.TEXT_FONT],
    )

    await wrapper.get('.font-preview').trigger('click')
    await wrapper.setProps({ type: FontTypes.TEXT_FONT, types: [FontTypes.TEXT_FONT] })
    await wrapper.get('.font-preview').trigger('click')
    await wrapper.get('.font-preview').trigger('click')
    await wrapper.setProps({
      type: FontTypes.TIME_FONT,
      types: [FontTypes.TIME_FONT, FontTypes.TEXT_FONT],
    })
    await wrapper.get('.font-preview').trigger('click')

    expect(initRecentFonts).toHaveBeenCalledTimes(3)

    await wrapper.get('.font-preview').trigger('click')
    await wrapper.setProps({ type: FontTypes.TEXT_FONT, types: undefined, dateContentLanguage: 'zh' })
    await wrapper.get('.font-preview').trigger('click')
    for (const child of [FontSearchStub, RecentFontListStub, DesignerFontListStub]) {
      expect(wrapper.getComponent(child).props('types')).toEqual(['text_font_zh'])
    }
    expect(initRecentFonts).toHaveBeenLastCalledWith(undefined, ['text_font_zh'])
    expect(initBuiltinFonts).toHaveBeenLastCalledWith('text_font_zh')

    // Labels and ordinary text inherit the design language without an override.
    useDesignStore().appLanguage = 'zhs'
    await wrapper.setProps({ dateContentLanguage: undefined })
    for (const child of [FontSearchStub, RecentFontListStub, DesignerFontListStub]) {
      expect(wrapper.getComponent(child).props('types')).toEqual(['text_font_zh'])
      expect(wrapper.getComponent(child).props('dateContentLanguage')).toBe('zh')
    }

    await wrapper.setProps({ dateContentLanguage: 'en' })
    expect(wrapper.getComponent(DesignerFontListStub).props('types')).toBeUndefined()
  })
})
