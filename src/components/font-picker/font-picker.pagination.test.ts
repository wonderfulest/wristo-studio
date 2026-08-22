// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'
import FontPicker from './font-picker.vue'
import { getFontBySlug } from '@/api/wristo/fonts'
import { useFontStore } from '@/stores/fontStore'
import { useUserStore } from '@/stores/user'

vi.mock('opentype.js', () => ({ default: {}, parse: vi.fn() }))
vi.mock('@/api/wristo/fonts', () => ({
  getFontBySlug: vi.fn(),
  getFontStyleTags: vi.fn().mockResolvedValue({ data: [] }),
  getSystemFonts: vi.fn().mockResolvedValue({ data: [] }),
  getRecentFonts: vi.fn().mockResolvedValue({ data: [] }),
  updateMyFontSearchIndex: vi.fn(),
}))

const loadUntilFont = vi.fn().mockResolvedValue(false)
const showLocatedFont = vi.fn()
const loadNextPage = vi.fn()

const DesignerFontListStub = defineComponent({
  name: 'DesignerFontList',
  setup(_, { expose }) {
    expose({ loadUntilFont, showLocatedFont, loadNextPage })
    return () => h('div', { class: 'designer-font-list-stub' })
  },
})

const mountPicker = async () => {
  const fontStore = useFontStore()
  fontStore.fetchFonts = vi.fn().mockResolvedValue(undefined)
  fontStore.loadFont = vi.fn().mockResolvedValue(true)
  vi.spyOn(fontStore, 'initRecentFonts').mockResolvedValue(undefined)
  useUserStore().setUserInfo({ roles: [{ roleCode: 'ROLE_ADMIN' }] } as any)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/fonts', component: { template: '<div />' } },
    ],
  })

  const wrapper = mount(FontPicker, {
    props: { modelValue: 'clock-bold', type: 'number_font', types: ['number_font', 'text_font'] },
    global: {
      plugins: [router],
      stubs: {
        Teleport: true,
        FontPreviewText: true,
        FontSearch: true,
        RecentFontList: true,
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
  return wrapper
}

describe('font picker pagination requests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    loadUntilFont.mockClear()
    showLocatedFont.mockClear()
    loadNextPage.mockClear()
    vi.mocked(getFontBySlug).mockReset()
  })

  it('does not scan pages when the picker opens', async () => {
    await mountPicker()

    expect(loadUntilFont).not.toHaveBeenCalled()
    expect(getFontBySlug).not.toHaveBeenCalled()
  })

  it('uses one exact slug request when the locate button is clicked', async () => {
    vi.mocked(getFontBySlug).mockResolvedValue({
      data: {
        id: 9,
        slug: 'clock-bold',
        family: 'Clock Sans',
        fullName: 'Clock Sans Bold',
        type: 'number_font',
        ttfFile: { url: '/fonts/clock-bold.ttf' },
      },
    } as any)
    const wrapper = await mountPicker()

    await wrapper.get('.locate-font-btn').trigger('click')
    await vi.waitFor(() => expect(showLocatedFont).toHaveBeenCalledTimes(1))

    expect(getFontBySlug).toHaveBeenCalledTimes(1)
    expect(getFontBySlug).toHaveBeenCalledWith('clock-bold')
    expect(loadUntilFont).not.toHaveBeenCalled()
  })

  it('requests the next page only while scrolling downward near the bottom', async () => {
    const wrapper = await mountPicker()
    const panel = wrapper.get('.font-panel').element as HTMLElement
    Object.defineProperty(panel, 'clientHeight', { configurable: true, value: 200 })
    Object.defineProperty(panel, 'scrollHeight', { configurable: true, value: 1000 })

    panel.scrollTop = 700
    await wrapper.get('.font-panel').trigger('scroll')
    expect(loadNextPage).toHaveBeenCalledTimes(1)

    panel.scrollTop = 650
    await wrapper.get('.font-panel').trigger('scroll')
    expect(loadNextPage).toHaveBeenCalledTimes(1)

    await wrapper.get('.font-panel').trigger('scroll')
    expect(loadNextPage).toHaveBeenCalledTimes(1)
  })
})
