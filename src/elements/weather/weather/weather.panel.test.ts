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

vi.mock('@/api/wristo/weather', () => ({
  getWeatherConditions: vi.fn().mockResolvedValue({ data: [] }),
}))

vi.mock('@/api/wristo/iconGlyph', () => ({
  getIconGlyphByCode: vi.fn().mockResolvedValue({ data: null }),
}))

describe('weather settings panel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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
})
