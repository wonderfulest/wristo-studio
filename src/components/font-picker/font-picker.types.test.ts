// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import FontPicker from './font-picker.vue'
import { FontTypes } from '@/config/fonts'
import { useFontStore } from '@/stores/fontStore'
import { useUserStore } from '@/stores/user'

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
  props: ['types'],
  template: `<div class="${className}" />`,
})

describe('font picker multi-type queries', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('propagates allowed types and refreshes recent fonts whenever the picker reopens', async () => {
    const fontStore = useFontStore()
    fontStore.fetchFonts = vi.fn().mockResolvedValue(undefined)
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
        type: FontTypes.NUMBER_FONT,
        types: [FontTypes.NUMBER_FONT, FontTypes.TEXT_FONT],
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
      FontTypes.NUMBER_FONT,
      FontTypes.TEXT_FONT,
    ])
    expect(wrapper.getComponent(RecentFontListStub).props('types')).toEqual([
      FontTypes.NUMBER_FONT,
      FontTypes.TEXT_FONT,
    ])
    expect(wrapper.getComponent(DesignerFontListStub).props('types')).toEqual([
      FontTypes.NUMBER_FONT,
      FontTypes.TEXT_FONT,
    ])
    expect(initRecentFonts).toHaveBeenLastCalledWith(
      undefined,
      [FontTypes.NUMBER_FONT, FontTypes.TEXT_FONT],
    )

    await wrapper.get('.font-preview').trigger('click')
    await wrapper.setProps({ type: FontTypes.TEXT_FONT, types: [FontTypes.TEXT_FONT] })
    await wrapper.get('.font-preview').trigger('click')
    await wrapper.get('.font-preview').trigger('click')
    await wrapper.setProps({
      type: FontTypes.NUMBER_FONT,
      types: [FontTypes.NUMBER_FONT, FontTypes.TEXT_FONT],
    })
    await wrapper.get('.font-preview').trigger('click')

    expect(initRecentFonts).toHaveBeenCalledTimes(3)
  })
})
