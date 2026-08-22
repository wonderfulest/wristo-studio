// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TimePanel from './time.panel.vue'
import { FontTypes } from '@/config/fonts'
import { TimeFormatConstants } from '@/config/elements/options/timeFormats'
import { useFontStore } from '@/stores/fontStore'

vi.mock('opentype.js', () => ({ default: {}, parse: vi.fn() }))

const FontPickerStub = {
  name: 'FontPicker',
  props: ['modelValue', 'type', 'types'],
  template: '<div class="font-picker-stub" />',
}

const SlotStub = { template: '<div><slot /></div>' }

const mountPanel = (formatter: TimeFormatConstants) => {
  const fontStore = useFontStore()
  fontStore.fetchFonts = vi.fn().mockResolvedValue(undefined)
  fontStore.loadFont = vi.fn().mockResolvedValue(true)
  return mount(TimePanel, {
    props: {
      config: {
        formatter,
        fontFamily: 'roboto-condensed-regular',
        fontRenderType: 'truetype',
      },
    },
    global: {
      stubs: {
        FontPicker: FontPickerStub,
        BitmapFontPicker: true,
        ColorPicker: true,
        AlignXButtons: true,
        FontSizeSelect: true,
        'el-form': SlotStub,
        'el-form-item': SlotStub,
        'el-radio-group': SlotStub,
        'el-radio': true,
        'el-input-number': true,
        'el-select': true,
        'el-option': true,
      },
    },
  })
}

describe('time panel font picker types', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('passes number and text types for a numeric time element', () => {
    const picker = mountPanel(TimeFormatConstants.HH_MM).getComponent(FontPickerStub)

    expect(picker.props('type')).toBe(FontTypes.NUMBER_FONT)
    expect(picker.props('types')).toEqual([FontTypes.NUMBER_FONT, FontTypes.TEXT_FONT])
  })

  it('passes only text type for an AM/PM element', () => {
    const picker = mountPanel(TimeFormatConstants.A).getComponent(FontPickerStub)

    expect(picker.props('type')).toBe(FontTypes.TEXT_FONT)
    expect(picker.props('types')).toEqual([FontTypes.TEXT_FONT])
  })
})
