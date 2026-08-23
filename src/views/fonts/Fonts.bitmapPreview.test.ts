// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadFont: vi.fn().mockResolvedValue(true),
  searchFonts: vi.fn(),
}))

vi.mock('@/stores/fontStore', () => ({
  useFontStore: () => ({ loadFont: mocks.loadFont }),
}))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    canUsePremiumStudioAssets: true,
    userInfo: { id: 1 },
  }),
}))
vi.mock('@/composables/useStudioMembershipGate', () => ({
  useStudioMembershipGate: () => ({ requirePremium: vi.fn() }),
}))
vi.mock('@/api/wristo/fonts', () => ({
  getFontStyleTags: vi.fn().mockResolvedValue({ data: [] }),
  searchFonts: mocks.searchFonts,
  updateMyFontSearchIndex: vi.fn(),
}))
vi.mock('@/api/common', () => ({
  getEnumOptions: vi.fn().mockResolvedValue({ data: [{ name: 'TEXT_FONT', value: 'text_font' }] }),
}))
vi.mock('@/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

import Fonts from './Fonts.vue'

describe('font library bitmap preview', () => {
  beforeEach(() => {
    mocks.loadFont.mockClear()
    mocks.searchFonts.mockResolvedValue({
      data: {
        list: [{
          id: 88,
          family: 'Noto Sans SC Black',
          fullName: 'Noto Sans SC Black',
          slug: 'noto-sans-sc-black',
          type: 'text_font_zh',
          language: 'zh',
          isSystem: 1,
          ttfFile: { url: '/fonts/source.ttf' },
          bitmapPreviewDescriptorUrl: '/fonts/preview.fnt',
          bitmapPreviewAtlasUrl: '/fonts/preview.png',
        }],
        total: 1,
        meta: { interpretedFilters: [] },
      },
    })
  })

  it('renders a managed font card from its published bitmap assets instead of loading its TTF', async () => {
    const wrapper = shallowMount(Fonts, {
      global: {
        stubs: {
          ElTabs: { template: '<div><slot /></div>' },
          ElTabPane: { template: '<div><slot /></div>' },
          ElPagination: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElSelect: true,
          ElOption: true,
          ElInput: true,
          ElSwitch: true,
          ElButton: true,
          FontListItem: {
            name: 'FontListItem',
            props: [
              'fontFamily',
              'bitmapPreviewDescriptorUrl',
              'bitmapPreviewAtlasUrl',
            ],
            template: '<div data-font-card />',
          },
        },
      },
    })

    await flushPromises()

    const card = wrapper.getComponent({ name: 'FontListItem' })
    expect(card.props('bitmapPreviewDescriptorUrl')).toBe('/fonts/preview.fnt')
    expect(card.props('bitmapPreviewAtlasUrl')).toBe('/fonts/preview.png')
    expect(mocks.loadFont).not.toHaveBeenCalledWith('noto-sans-sc-black', '/fonts/source.ttf')
  })
})
