// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { getDesignerUsageFontsPage } from '@/api/wristo/fonts'
import DesignerFontList from './DesignerFontList.vue'

vi.mock('@/api/wristo/fonts', () => ({
  getDesignerUsageFontsPage: vi.fn(),
  searchFonts: vi.fn(),
}))

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

const FontFamilyListStub = defineComponent({
  name: 'FontFamilyList',
  props: {
    fonts: { type: Array, default: () => [] },
  },
  setup(props) {
    return () => h('div', [
      h('span', { class: 'font-values' }, (props.fonts as any[]).map((font) => font.value).join(',')),
      h('span', { class: 'font-owners' }, (props.fonts as any[]).map((font) => font.userId ?? '').join(',')),
      h('span', { class: 'font-recipes' }, (props.fonts as any[]).map((font) => font.bitmapRecipe?.fontWeight ?? '').join(',')),
    ])
  },
})

describe('DesignerFontList type request ordering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getDesignerUsageFontsPage).mockReset()
  })

  it('keeps the newest type page when an older request finishes last', async () => {
    const numberPage = deferred<any>()
    const textPage = deferred<any>()
    vi.mocked(getDesignerUsageFontsPage)
      .mockReturnValueOnce(numberPage.promise)
      .mockReturnValueOnce(textPage.promise)
    const wrapper = mount(DesignerFontList, {
      props: {
        modelValue: '',
        type: 'time_font',
        types: ['time_font'],
        canUsePremiumAssets: true,
      },
      global: {
        stubs: {
          FontFamilyList: FontFamilyListStub,
        },
      },
    })

    await wrapper.setProps({ type: 'text_font', types: ['text_font'] })
    await vi.waitFor(() => expect(getDesignerUsageFontsPage).toHaveBeenCalledTimes(2))
    textPage.resolve({ code: 0, data: { list: [{ id: 2, slug: 'text-new', type: 'text_font' }], total: 1 } })
    await vi.waitFor(() => expect(wrapper.get('.font-values').text()).toBe('text-new'))
    numberPage.resolve({ code: 0, data: { list: [{ id: 1, slug: 'number-old', type: 'time_font' }], total: 1 } })
    await Promise.resolve()
    await Promise.resolve()

    expect(wrapper.get('.font-values').text()).toBe('text-new')
  })

  it('keeps returned fonts with missing type when the request already specifies allowed types', async () => {
    vi.mocked(getDesignerUsageFontsPage).mockResolvedValue({
      code: 0,
      data: {
        list: [
          { id: 1, slug: 'clock-number', family: 'Clock Sans', fullName: 'Clock Sans Digits', type: 'time_font' },
          { id: 2, slug: 'clock-text', family: 'Clock Sans', fullName: 'Clock Sans Regular' },
        ],
        total: 2,
      },
    } as any)

    const wrapper = mount(DesignerFontList, {
      props: {
        modelValue: '',
        type: 'time_font',
        types: ['time_font', 'text_font'],
        canUsePremiumAssets: true,
      },
      global: {
        stubs: {
          FontFamilyList: FontFamilyListStub,
        },
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.get('.font-values').text()).toBe('clock-number,clock-text')
    })
  })

  it('preserves the API owner id for quick-edit visibility', async () => {
    vi.mocked(getDesignerUsageFontsPage).mockResolvedValue({
      code: 0,
      data: {
        list: [{ id: 42, userId: 7, slug: 'my-clock', family: 'My Clock', type: 'time_font' }],
        total: 1,
      },
    } as any)

    const wrapper = mount(DesignerFontList, {
      props: {
        modelValue: '',
        type: 'time_font',
        canUsePremiumAssets: true,
      },
      global: { stubs: { FontFamilyList: FontFamilyListStub } },
    })

    await vi.waitFor(() => expect(wrapper.get('.font-owners').text()).toBe('7'))
  })

  it('preserves and registers bitmap style recipes for list and canvas previews', async () => {
    const recipe = { schemaVersion: 1, rendererVersion: '1', fontWeight: 800, italicAngle: -13, outlineWidthEm: 0, outlineMode: 'fill', lineJoin: 'round', antialias: true }
    vi.mocked(getDesignerUsageFontsPage).mockResolvedValue({
      code: 0,
      data: { list: [{ id: 42, slug: 'quantico-styled', family: 'Quantico', type: 'time_font', bitmapRecipe: JSON.stringify(recipe) }], total: 1 },
    } as any)

    const wrapper = mount(DesignerFontList, {
      props: { modelValue: '', type: 'time_font', canUsePremiumAssets: true },
      global: { stubs: { FontFamilyList: FontFamilyListStub } },
    })

    await vi.waitFor(() => expect(wrapper.get('.font-recipes').text()).toBe('800'))
    expect((await import('@/stores/fontStore')).useFontStore().serverFonts.get('quantico-styled')?.bitmapRecipe).toEqual(recipe)
  })

  it('loads only the first page until the caller requests the next page', async () => {
    vi.mocked(getDesignerUsageFontsPage)
      .mockResolvedValueOnce({
        code: 0,
        data: {
          list: Array.from({ length: 10 }, (_, index) => ({
            id: index + 1,
            slug: `clock-${index + 1}`,
            family: `Clock ${index + 1}`,
            type: 'time_font',
          })),
          total: 20,
        },
      } as any)
      .mockResolvedValueOnce({
        code: 0,
        data: {
          list: [{ id: 11, slug: 'clock-11', family: 'Clock 11', type: 'time_font' }],
          total: 20,
        },
      } as any)

    const wrapper = mount(DesignerFontList, {
      props: {
        modelValue: '',
        type: 'time_font',
        types: ['time_font', 'text_font'],
        canUsePremiumAssets: true,
      },
      global: {
        stubs: {
          FontFamilyList: FontFamilyListStub,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getDesignerUsageFontsPage).toHaveBeenCalledTimes(1)
      expect(wrapper.get('.font-values').text()).toContain('clock-10')
    })
    expect(getDesignerUsageFontsPage).toHaveBeenCalledTimes(1)

    await (wrapper.vm as any).loadNextPage()

    expect(getDesignerUsageFontsPage).toHaveBeenCalledTimes(2)
    expect(vi.mocked(getDesignerUsageFontsPage).mock.calls[1][0].pageNum).toBe(2)
  })

  it('loads another page when filtering leaves the initial visible list incomplete', async () => {
    vi.mocked(getDesignerUsageFontsPage)
      .mockResolvedValueOnce({
        code: 0,
        data: {
          list: Array.from({ length: 10 }, (_, index) => ({
            id: index + 1,
            slug: `clock-${index + 1}`,
            family: `Clock ${index + 1}`,
            type: 'time_font',
          })),
          total: 20,
        },
      } as any)
      .mockResolvedValueOnce({
        code: 0,
        data: {
          list: Array.from({ length: 10 }, (_, index) => ({
            id: index + 11,
            slug: `clock-${index + 11}`,
            family: `Clock ${index + 11}`,
            type: 'time_font',
          })),
          total: 20,
        },
      } as any)

    const wrapper = mount(DesignerFontList, {
      props: {
        modelValue: '',
        type: 'time_font',
        canUsePremiumAssets: true,
        excludedFontValues: new Set(Array.from({ length: 8 }, (_, index) => `clock-${index + 1}`)),
      },
      global: { stubs: { FontFamilyList: FontFamilyListStub } },
    })

    await vi.waitFor(() => expect(wrapper.get('.font-values').text()).toContain('clock-20'))

    expect(getDesignerUsageFontsPage).toHaveBeenCalledTimes(2)
    expect(wrapper.get('.font-values').text().split(',')).toHaveLength(12)
  })
})
