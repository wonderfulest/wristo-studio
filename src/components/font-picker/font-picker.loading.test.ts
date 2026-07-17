// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import FontPicker from './font-picker.vue'
import { useFontStore } from '@/stores/fontStore'
import { useUserStore } from '@/stores/user'

vi.mock('opentype.js', () => ({
  default: {},
  parse: vi.fn(),
}))

vi.mock('@/api/wristo/fonts', () => ({
  getFontBySlug: vi.fn().mockResolvedValue({
    data: { ttfFile: { url: '/fonts/large-time-font.ttf' } },
  }),
  getFontStyleTags: vi.fn().mockResolvedValue({ data: [] }),
  getSystemFonts: vi.fn().mockResolvedValue({ data: [] }),
  getRecentFonts: vi.fn().mockResolvedValue({ data: [] }),
  updateMyFontSearchIndex: vi.fn(),
}))

describe('font picker loading', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads the selected slug even when the browser reports its display family available', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        check: vi.fn().mockReturnValue(true),
      },
    })

    const fontStore = useFontStore()
    fontStore.loadedFonts.add('current-font')
    fontStore.fetchFonts = vi.fn().mockResolvedValue(undefined)
    const loadFont = vi.spyOn(fontStore, 'loadFont').mockResolvedValue(true)
    useUserStore().setUserInfo({
      roles: [{ roleCode: 'ROLE_ADMIN' }],
    } as any)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/fonts', component: { template: '<div />' } },
      ],
    })

    const wrapper = mount(FontPicker, {
      props: {
        modelValue: 'current-font',
      },
      global: {
        plugins: [router],
        stubs: {
          Teleport: true,
          FontPreviewText: true,
          RecentFontList: true,
          DesignerFontList: true,
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
          FontSearch: {
            template: '<button class="select-test-font" @click="$emit(\'select\', font)">select</button>',
            data: () => ({
              font: {
                value: 'large-time-font',
                family: 'Large Time Font',
                isSystem: 1,
              },
            }),
          },
        },
      },
    })

    await wrapper.get('.font-preview').trigger('click')
    await wrapper.get('.select-test-font').trigger('click')
    await vi.waitFor(() => {
      expect(loadFont).toHaveBeenCalledWith(
        'large-time-font',
        `${location.origin}/fonts/large-time-font.ttf`,
      )
    })
  })
})
