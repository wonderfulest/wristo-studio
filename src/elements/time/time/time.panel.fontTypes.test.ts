// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TimePanel from './time.panel.vue'
import { FontTypes } from '@/config/fonts'
import { TimeFormatConstants } from '@/config/elements/options/timeFormats'
import { useFontStore } from '@/stores/fontStore'
import { useCanvasStore } from '@/stores/canvasStore'

vi.mock('opentype.js', () => ({ default: {}, parse: vi.fn() }))

const FontPickerStub = {
  name: 'FontPicker',
  props: ['modelValue', 'type', 'types'],
  template: '<div class="font-picker-stub" />',
}

const RadioGroupStub = { name: 'ElRadioGroup', props: ['modelValue'], emits: ['update:modelValue'], template: '<div><slot /></div>' }
const SelectStub = { name: 'ElSelect', emits: ['change'], template: '<div />' }

const SlotStub = { template: '<div><slot /></div>' }

const BitmapFontPickerStub = {
  name: 'BitmapFontPicker',
  emits: ['change'],
  template: '<button class="bitmap-font-picker-stub" @click="$emit(\'change\', 22)" />',
}

const mountPanel = (formatter: TimeFormatConstants, overrides = {}, applyPatch = vi.fn()) => {
  const fontStore = useFontStore()
  fontStore.fetchFonts = vi.fn().mockResolvedValue(undefined)
  fontStore.loadFont = vi.fn().mockResolvedValue(true)
  return mount(TimePanel, {
    props: {
      config: {
        formatter,
        fontFamily: 'roboto-condensed-regular',
        fontRenderType: 'truetype',
        ...overrides,
      },
      applyPatch,
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
        'el-radio-group': RadioGroupStub,
        'el-radio': true,
        'el-input-number': true,
        'el-select': SelectStub,
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

    expect(picker.props('type')).toBe(FontTypes.TIME_FONT)
    expect(picker.props('types')).toEqual([FontTypes.TIME_FONT, FontTypes.TEXT_FONT])
  })

  it('passes only text type for an AM/PM element', () => {
    const picker = mountPanel(TimeFormatConstants.A).getComponent(FontPickerStub)

    expect(picker.props('type')).toBe(FontTypes.TEXT_FONT)
    expect(picker.props('types')).toEqual([FontTypes.TEXT_FONT])
  })

  it('allows each bitmap time element to select a different font', async () => {
    const fontStore = useFontStore()
    fontStore.fetchFonts = vi.fn().mockResolvedValue(undefined)
    fontStore.loadFont = vi.fn().mockResolvedValue(true)
    const canvasStore = useCanvasStore()
    ;(canvasStore as any).canvas = {
      getObjects: () => [
        { id: 'other-time', eleType: 'time', fontRenderType: 'bitmap', bitmapFontId: 11 },
      ],
    }
    const applyPatch = vi.fn()
    const wrapper = mount(TimePanel, {
      props: {
        config: {
          id: 'current-time',
          formatter: TimeFormatConstants.HH_MM,
          fontRenderType: 'bitmap',
          bitmapFontId: 11,
        },
        applyPatch,
      },
      global: {
        stubs: {
          FontPicker: FontPickerStub,
          BitmapFontPicker: BitmapFontPickerStub,
          ColorPicker: true,
          AlignXButtons: true,
          FontSizeSelect: true,
          'el-form': SlotStub,
          'el-form-item': SlotStub,
          'el-radio-group': RadioGroupStub,
          'el-radio': true,
          'el-input-number': true,
          'el-select': SelectStub,
          'el-option': true,
        },
      },
    })

    await wrapper.get('.bitmap-font-picker-stub').trigger('click')
    await vi.waitFor(() => {
      expect(applyPatch).toHaveBeenCalledWith({ fontRenderType: 'bitmap', bitmapFontId: 22 })
    })
  })
})

describe('leaving bitmap mode', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('clears the current bitmap selection and includes the clear in the update patch', async () => {
    const applyPatch = vi.fn()
    const wrapper = mountPanel(TimeFormatConstants.HH_MM, { fontRenderType: 'bitmap', bitmapFontId: 11 }, applyPatch)
    wrapper.getComponent(RadioGroupStub).vm.$emit('update:modelValue', 'truetype')
    expect(wrapper.props('config')?.bitmapFontId).toBeNull()
    expect(applyPatch).toHaveBeenCalledWith(expect.objectContaining({ fontRenderType: 'truetype', bitmapFontId: null }))
    wrapper.getComponent(RadioGroupStub).vm.$emit('update:modelValue', 'bitmap')
    expect(applyPatch).toHaveBeenLastCalledWith({ fontRenderType: 'bitmap' })
  })

  it('clears the bitmap selection when the hour indicator forces TrueType', () => {
    const applyPatch = vi.fn()
    const wrapper = mountPanel(TimeFormatConstants.HH_MM, { fontRenderType: 'bitmap', bitmapFontId: 11 }, applyPatch)
    wrapper.getComponent(SelectStub).vm.$emit('change', TimeFormatConstants.HOUR_FORMAT)
    expect(wrapper.props('config')?.bitmapFontId).toBeNull()
    expect(applyPatch).toHaveBeenCalledWith(expect.objectContaining({ fontRenderType: 'truetype', bitmapFontId: null }))
  })
})
