// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/engine/managers/elementManager', () => ({ updateElement: vi.fn() }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/color-picker/index.vue', () => ({ default: { name: 'ColorPicker', template: '<div />' } }))

import TrianglePanel from './triangle.panel.vue'

describe('triangle panel', () => {
  it('sends numeric rotation changes through the element patch contract', async () => {
    const applyPatch = vi.fn()
    const wrapper = mount(TrianglePanel, {
      props: {
        config: {
          width: 100,
          height: 80,
          rotation: 0,
          fill: '#ffffff',
          stroke: '#000000',
          strokeWidth: 1,
          opacity: 1,
        },
        applyPatch,
      },
      global: {
        stubs: {
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { props: ['label'], template: '<label><slot name="label" /><slot /></label>' },
          'el-input-number': { name: 'ElInputNumber', props: ['modelValue'], emits: ['change'], template: '<input />' },
          'el-slider': true,
          'el-select': true,
          'el-option': true,
          ColorPicker: true,
        },
      },
    })

    const inputs = wrapper.findAllComponents({ name: 'ElInputNumber' })
    expect(inputs).toHaveLength(4)
    inputs[2].vm.$emit('change', 45)
    await wrapper.vm.$nextTick()

    expect(applyPatch).toHaveBeenCalledWith({ rotation: 45 })
  })
})
