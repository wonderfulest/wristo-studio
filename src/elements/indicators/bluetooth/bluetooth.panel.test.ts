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
vi.mock('@/components/font-picker/font-picker.vue', () => ({ default: { template: '<div />' } }))

import BluetoothPanel from './bluetooth.panel.vue'

const stubs = {
  ColorPicker: true,
  FontPicker: true,
  FontSizeSelect: {
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
})
