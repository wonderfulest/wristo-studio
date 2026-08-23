// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WeatherPanel from './weather.panel.vue'
import { useFontStore } from '@/stores/fontStore'

vi.mock('opentype.js', () => ({
  default: {},
  parse: vi.fn(),
}))

const { getWeatherConditions, getDesignerUsageFontsPage, messageWarning } = vi.hoisted(() => ({
  getWeatherConditions: vi.fn(),
  getDesignerUsageFontsPage: vi.fn(),
  messageWarning: vi.fn(),
}))

vi.mock('element-plus', async (importOriginal) => ({
  ...await importOriginal<typeof import('element-plus')>(),
  ElMessage: { success: vi.fn(), warning: messageWarning },
}))

vi.mock('@/api/wristo/weather', () => ({ getWeatherConditions }))
vi.mock('@/api/wristo/fonts', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/api/wristo/fonts')>(),
  getDesignerUsageFontsPage,
}))

vi.mock('@/api/wristo/iconGlyph', () => ({
  getIconGlyphByCode: vi.fn().mockResolvedValue({ data: null }),
}))

describe('weather settings panel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    getWeatherConditions.mockResolvedValue({ data: [] })
    getDesignerUsageFontsPage.mockResolvedValue({
      data: {
        pageNum: 1,
        pageSize: 100,
        total: 1,
        pages: 1,
        list: [{ id: 1, slug: 'weather-font', fullName: 'Weather Font', type: 'weather_font' }],
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses an independent weather-font dropdown without display-mode tabs', async () => {
    const wrapper = shallowMount(WeatherPanel, {
      props: {
        config: { fontFamily: 'weather-font' },
        applyPatch: vi.fn(),
      },
      global: {
        stubs: {
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-select': { template: '<select class="weather-font-select"><slot /></select>' },
          'el-option': true,
          'el-icon': true,
          EditPen: true,
          'el-button': true,
          'el-tooltip': true,
          'el-tabs': true,
          'el-tab-pane': true,
          'el-dialog': true,
        },
        directives: {
          loading: {},
        },
      },
    })

    await vi.waitFor(() => expect(getDesignerUsageFontsPage).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 100,
      type: 'weather_font',
    }))
    expect(wrapper.find('.weather-font-select').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'FontPicker' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ElTabs' }).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('AMOLED')
    await vi.waitFor(() => expect(useFontStore().serverFonts.has('weather-font')).toBe(true))
  })

  it('loads the selected weather font conditions without a display type', async () => {
    const applyPatch = vi.fn()
    getWeatherConditions.mockResolvedValue({
      data: [{
        condition: 'clear_sky',
        iconUnicode: '101d',
        asset: { id: 1, iconId: 1, sourceType: 'system', format: 'svg', displayType: 'mip', svgFile: '/weather/101d.svg' },
      }],
    })

    const wrapper = shallowMount(WeatherPanel, {
      props: { config: { fontFamily: 'weather-font' }, applyPatch },
      global: {
        stubs: {
          'font-picker': true,
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-select': { template: '<select><slot /></select>' },
          'el-option': true,
          'el-icon': true,
          EditPen: true,
          'el-button': true,
          'el-tooltip': { template: '<div><slot /></div>' },
          'el-tabs': { template: '<div><slot /></div>' },
          'el-tab-pane': { template: '<div><slot /></div>' },
          'el-dialog': true,
        },
        directives: { loading: {} },
      },
    })

    await vi.waitFor(() => expect(wrapper.find('img.weather-asset-preview').exists()).toBe(true))
    expect(getWeatherConditions).toHaveBeenCalledWith('weather-font')
    expect(getWeatherConditions).toHaveBeenCalledTimes(1)
    expect(wrapper.get('img.weather-asset-preview').attributes('src')).toBe('/weather/101d.svg')
    expect(applyPatch).toHaveBeenCalledWith(expect.objectContaining({
      iconUnicode: '101d',
      previewSource: '/weather/101d.svg',
    }))
  })

  it('optically centers cloud glyph fallbacks with known asymmetric ink bounds', async () => {
    getWeatherConditions.mockResolvedValue({ data: [{ condition: 'few_clouds', iconUnicode: '102d' }] })

    const wrapper = shallowMount(WeatherPanel, {
      props: { config: { fontFamily: 'weather-font' }, applyPatch: vi.fn() },
      global: {
        stubs: {
          'font-picker': true,
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-select': { template: '<select><slot /></select>' },
          'el-option': true,
          'el-icon': true,
          EditPen: true,
          'el-button': true,
          'el-tooltip': { template: '<div><slot /></div>' },
          'el-tabs': { template: '<div><slot /></div>' },
          'el-tab-pane': { template: '<div><slot /></div>' },
          'el-dialog': true,
        },
        directives: { loading: {} },
      },
    })

    await vi.waitFor(() => expect(wrapper.find('.weather-glyph').exists()).toBe(true))
    expect(wrapper.get('.weather-glyph').attributes('style')).toContain('translateX(0.56em)')
  })

  it('opens the weather font editor in a new tab from the font control', async () => {
    getDesignerUsageFontsPage.mockResolvedValue({
      data: { pageNum: 1, pageSize: 100, total: 0, pages: 0, list: [] },
    })
    const open = vi.spyOn(window, 'open').mockReturnValue(null)

    const wrapper = shallowMount(WeatherPanel, {
      props: { config: {}, applyPatch: vi.fn() },
      global: {
        stubs: {
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-select': { template: '<div><slot name="header" /><slot /><slot name="empty" /></div>' },
          'el-option': true,
          'el-icon': { template: '<span><slot /></span>' },
          EditPen: true,
          'el-button': { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
        },
        directives: { loading: {} },
      },
    })

    await wrapper.get('[data-test="weather-font-editor-entry"]').trigger('click')

    expect(open).toHaveBeenCalledWith('/weather-font-library?source=weather-element', '_blank', 'noopener')
    wrapper.unmount()
  })

  it('refreshes user weather fonts on return and selects the newly published font', async () => {
    const applyPatch = vi.fn()
    const existing = { id: 1, slug: 'weather-font', fullName: 'Weather Font', type: 'weather_font' }
    const created = { id: 2, slug: 'my-weather', fullName: 'My Weather', type: 'weather_font' }
    getDesignerUsageFontsPage
      .mockResolvedValueOnce({ data: { pageNum: 1, pageSize: 100, total: 1, pages: 1, list: [existing] } })
      .mockResolvedValueOnce({ data: { pageNum: 1, pageSize: 100, total: 2, pages: 1, list: [created, existing] } })
    vi.spyOn(window, 'open').mockReturnValue(null)

    const wrapper = shallowMount(WeatherPanel, {
      props: { config: { fontFamily: 'weather-font' }, applyPatch },
      global: {
        stubs: {
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-select': { template: '<div><slot name="header" /><slot /><slot name="empty" /></div>' },
          'el-option': true,
          'el-icon': { template: '<span><slot /></span>' },
          EditPen: true,
          'el-button': { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
        },
        directives: { loading: {} },
      },
    })

    await vi.waitFor(() => expect(getDesignerUsageFontsPage).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(applyPatch).toHaveBeenCalledTimes(1))
    applyPatch.mockClear()
    await wrapper.get('[data-test="weather-font-editor-entry"]').trigger('click')
    window.dispatchEvent(new Event('focus'))
    expect(getDesignerUsageFontsPage).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event('blur'))
    window.dispatchEvent(new Event('focus'))

    await vi.waitFor(() => expect(applyPatch).toHaveBeenCalledWith({ fontFamily: 'my-weather' }))
    expect(getDesignerUsageFontsPage).toHaveBeenCalledTimes(2)
    expect(getWeatherConditions).toHaveBeenLastCalledWith('my-weather')
    wrapper.unmount()
  })

  it('keeps the current font and warns when the return refresh fails', async () => {
    const applyPatch = vi.fn()
    const existing = { id: 1, slug: 'weather-font', fullName: 'Weather Font', type: 'weather_font' }
    getDesignerUsageFontsPage
      .mockResolvedValueOnce({ data: { pageNum: 1, pageSize: 100, total: 1, pages: 1, list: [existing] } })
      .mockRejectedValueOnce(new Error('offline'))
    vi.spyOn(window, 'open').mockReturnValue(null)

    const wrapper = shallowMount(WeatherPanel, {
      props: { config: { fontFamily: 'weather-font' }, applyPatch },
      global: {
        stubs: {
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-select': { template: '<div><slot name="header" /><slot /><slot name="empty" /></div>' },
          'el-option': true,
          'el-icon': { template: '<span><slot /></span>' },
          EditPen: true,
          'el-button': { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
        },
        directives: { loading: {} },
      },
    })

    await vi.waitFor(() => expect(getDesignerUsageFontsPage).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(applyPatch).toHaveBeenCalledTimes(1))
    applyPatch.mockClear()
    await wrapper.get('[data-test="weather-font-editor-entry"]').trigger('click')
    window.dispatchEvent(new Event('blur'))
    window.dispatchEvent(new Event('focus'))

    await vi.waitFor(() => expect(messageWarning).toHaveBeenCalledWith('Could not refresh weather fonts. Please try again.'))
    expect(applyPatch).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
