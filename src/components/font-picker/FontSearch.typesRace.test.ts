// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { searchFonts } from '@/api/wristo/fonts'
import FontSearch from './FontSearch.vue'
import { useFontStore } from '@/stores/fontStore'

vi.mock('opentype.js', () => ({ default: {}, parse: vi.fn() }))
vi.mock('@/api/wristo/fonts', () => ({ searchFonts: vi.fn() }))

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
      h('span', { class: 'font-recipes' }, (props.fonts as any[]).map((font) => font.bitmapRecipe?.fontWeight ?? '').join(',')),
    ])
  },
})

describe('FontSearch type request ordering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(searchFonts).mockReset()
  })

  it('does not request remote search while the query is empty', async () => {
    const wrapper = mount(FontSearch, {
      props: {
        modelValue: '',
        type: 'number_font',
        types: ['number_font', 'text_font'],
      },
      global: {
        stubs: {
          FontFamilyList: FontFamilyListStub,
          'el-icon': true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.get('input').element).toHaveProperty('value', '')
    expect(searchFonts).not.toHaveBeenCalled()
  })

  it('does not let an older type search overwrite the newest results', async () => {
    const numberSearch = deferred<any>()
    const textSearch = deferred<any>()
    vi.mocked(searchFonts)
      .mockReturnValueOnce(numberSearch.promise)
      .mockReturnValueOnce(textSearch.promise)
    const fontStore = useFontStore()
    fontStore.loadFont = vi.fn().mockResolvedValue(true)
    const wrapper = mount(FontSearch, {
      props: {
        modelValue: '',
        type: 'number_font',
        types: ['number_font'],
      },
      global: {
        stubs: {
          FontFamilyList: FontFamilyListStub,
          'el-icon': true,
        },
      },
    })

    await flushPromises()
    await wrapper.get('input').setValue('clock')
    await new Promise((resolve) => window.setTimeout(resolve, 275))
    await vi.waitFor(() => expect(searchFonts).toHaveBeenCalledTimes(1))
    await wrapper.setProps({ type: 'text_font', types: ['text_font'] })
    await vi.waitFor(() => expect(searchFonts).toHaveBeenCalledTimes(2))
    textSearch.resolve({ code: 0, data: { list: [{ id: 2, slug: 'text-new', type: 'text_font', isSystem: 1 }], total: 1 } })
    await vi.waitFor(() => expect(wrapper.text()).toContain('text-new'))
    numberSearch.resolve({ code: 0, data: { list: [{ id: 1, slug: 'number-old', type: 'number_font', isSystem: 1 }], total: 1 } })
    await Promise.resolve()
    await Promise.resolve()

    expect(wrapper.text()).toContain('text-new')
    expect(wrapper.text()).not.toContain('number-old')
  })

  it('preserves and registers bitmap recipes returned by search', async () => {
    const recipe = { schemaVersion: 1, rendererVersion: '1', fontWeight: 800, italicAngle: -13, outlineWidthEm: 0, outlineMode: 'fill', lineJoin: 'round', antialias: true }
    vi.mocked(searchFonts).mockResolvedValue({ code: 0, data: { list: [{ id: 1, slug: 'quantico-search', family: 'Quantico', type: 'number_font', isSystem: 1, bitmapRecipe: JSON.stringify(recipe), ttfFile: { url: 'data:font/ttf;base64,AA==' } }], total: 1 } } as any)
    const store = useFontStore()
    store.loadFont = vi.fn().mockResolvedValue(true)
    const wrapper = mount(FontSearch, {
      props: { modelValue: '', type: 'number_font' },
      global: { stubs: { FontFamilyList: FontFamilyListStub, 'el-icon': true } },
    })

    await wrapper.get('input').setValue('quantico')
    await new Promise((resolve) => window.setTimeout(resolve, 275))
    await vi.waitFor(() => expect(wrapper.get('.font-recipes').text()).toBe('800'))
    expect(store.serverFonts.get('quantico-search')?.bitmapRecipe).toEqual(recipe)
  })
})
