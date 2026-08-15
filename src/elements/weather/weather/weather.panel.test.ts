// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FontPicker from '@/components/font-picker/font-picker.vue'
import WeatherPanel from './weather.panel.vue'

vi.mock('opentype.js', () => ({
  default: {},
  parse: vi.fn(),
}))

const { getWeatherConditions } = vi.hoisted(() => ({
  getWeatherConditions: vi.fn(),
}))

vi.mock('@/api/wristo/weather', () => ({ getWeatherConditions }))

vi.mock('@/api/wristo/iconGlyph', () => ({
  getIconGlyphByCode: vi.fn().mockResolvedValue({ data: null }),
}))

describe('weather settings panel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getWeatherConditions.mockResolvedValue({ data: [] })
  })

  it('opts out of the global icon font strategy', () => {
    const wrapper = shallowMount(WeatherPanel, {
      props: {
        config: { fontFamily: 'weather-font' },
        applyPatch: vi.fn(),
      },
      global: {
        stubs: {
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-icon': true,
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

    expect(wrapper.getComponent(FontPicker).props('useGlobalIconFontStrategy')).toBe(false)
  })

  it('uses the bound MIP asset preview so the icon is centered independently of font metrics', async () => {
    getWeatherConditions.mockImplementation(async (_fontSlug: string, displayType: string) => ({
      data: displayType === 'mip' ? [{
        condition: 'clear_sky',
        iconUnicode: '101d',
        asset: { id: 1, iconId: 1, sourceType: 'system', format: 'svg', displayType: 'mip', imageUrl: '/weather/101d.svg' },
      }] : [],
    }))

    const wrapper = shallowMount(WeatherPanel, {
      props: { config: { fontFamily: 'weather-font' }, applyPatch: vi.fn() },
      global: {
        stubs: {
          'font-picker': true,
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-icon': true,
          'el-button': true,
          'el-tooltip': { template: '<div><slot /></div>' },
          'el-tabs': { template: '<div><slot /></div>' },
          'el-tab-pane': { template: '<div><slot /></div>' },
          'el-dialog': true,
        },
        directives: { loading: {} },
      },
    })

    await vi.waitFor(() => expect(wrapper.find('img.mip-weather-preview').exists()).toBe(true))
    expect(wrapper.get('img.mip-weather-preview').attributes('src')).toBe('/weather/101d.svg')
  })

  it('optically centers cloud glyph fallbacks with known asymmetric ink bounds', async () => {
    getWeatherConditions.mockImplementation(async (_fontSlug: string, displayType: string) => ({
      data: displayType === 'mip' ? [{ condition: 'few_clouds', iconUnicode: '102d' }] : [],
    }))

    const wrapper = shallowMount(WeatherPanel, {
      props: { config: { fontFamily: 'weather-font' }, applyPatch: vi.fn() },
      global: {
        stubs: {
          'font-picker': true,
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-icon': true,
          'el-button': true,
          'el-tooltip': { template: '<div><slot /></div>' },
          'el-tabs': { template: '<div><slot /></div>' },
          'el-tab-pane': { template: '<div><slot /></div>' },
          'el-dialog': true,
        },
        directives: { loading: {} },
      },
    })

    await vi.waitFor(() => expect(wrapper.find('.mip-weather-glyph').exists()).toBe(true))
    expect(wrapper.get('.mip-weather-glyph').attributes('style')).toContain('translateX(0.56em)')
  })
})
