// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/stores/baseStore', () => ({ useBaseStore: () => ({ canvas: null }) }))
vi.mock('@/stores/iconFontStrategyStore', () => ({
  useIconFontStrategyStore: () => ({ requestUpdateIconFontSize: vi.fn() }),
}))
vi.mock('@/components/color-picker/index.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/font-picker/font-picker.vue', () => ({
  default: { name: 'FontPicker', props: ['modelValue', 'useGlobalIconFontStrategy'], template: '<div />' },
}))

import BluetoothPanel from './bluetooth.panel.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'

const stubs = {
  ColorPicker: true,
  FontPicker: true,
  FontSizeSelect: {
    name: 'FontSizeSelect',
    props: ['modelValue'],
    template: '<output data-testid="font-size">{{ modelValue }}</output>',
  },
}

describe('bluetooth settings panel', () => {
  it('shows the latest font size when its config changes', async () => {
    const wrapper = mount(BluetoothPanel, {
      props: {
        config: { fontSize: 24, fontFamily: 'wristo-icon', fill: '#ffffff' },
        applyPatch: vi.fn(),
      },
      global: { stubs },
    })

    expect(wrapper.get('[data-testid="font-size"]').text()).toBe('24')

    await wrapper.setProps({
      config: { fontSize: 42, fontFamily: 'wristo-icon', fill: '#ffffff' },
    })
    await nextTick()

    expect(wrapper.get('[data-testid="font-size"]').text()).toBe('42')
  })

  it('falls back to the live element font size when the restored config omits it', () => {
    const wrapper = mount(BluetoothPanel, {
      props: {
        config: { id: 'bluetooth-1', eleType: 'bluetooth', left: 120, top: 160 },
        element: { id: 'bluetooth-1', eleType: 'bluetooth', fontSize: 42 },
        applyPatch: vi.fn(),
      },
      global: { stubs },
    })

    expect(wrapper.get('[data-testid="font-size"]').text()).toBe('42')
  })

  it('changes only the current indicator font and size', async () => {
    const applyPatch = vi.fn()
    const wrapper = mount(BluetoothPanel, {
      props: {
        config: { id: 'bluetooth-1', fontSize: 24, fontFamily: 'wristo-icon', fill: '#ffffff' },
        applyPatch,
      },
      global: { stubs },
    })

    expect(wrapper.getComponent(FontPicker).props('useGlobalIconFontStrategy')).toBe(false)

    await wrapper.getComponent(FontPicker).vm.$emit('update:modelValue', 'weather-icons')
    await wrapper.getComponent({ name: 'FontSizeSelect' }).vm.$emit('change', 42)

    expect(applyPatch).toHaveBeenNthCalledWith(1, { fontFamily: 'weather-icons' })
    expect(applyPatch).toHaveBeenNthCalledWith(2, { fontSize: 42 })
  })
})
