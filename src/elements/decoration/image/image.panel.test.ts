// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/engine/managers/elementManager', () => ({ updateElement: vi.fn() }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/asset-picker/index.vue', () => ({ default: { name: 'AssetPicker', template: '<div />' } }))

import ImagePanel from './image.panel.vue'

describe('image panel', () => {
  it('patches numeric rotation changes', async () => {
    const applyPatch = vi.fn()
    const wrapper = mount(ImagePanel, {
      props: {
        config: { imageUrl: '', rotation: 0 },
        applyPatch,
      },
      global: {
        stubs: {
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { props: ['label'], template: '<label><slot /></label>' },
          'el-input-number': { name: 'ElInputNumber', props: ['modelValue'], emits: ['change'], template: '<input />' },
          AssetPicker: true,
        },
      },
    })

    wrapper.findComponent({ name: 'ElInputNumber' }).vm.$emit('change', 45)
    await wrapper.vm.$nextTick()

    expect(applyPatch).toHaveBeenCalledWith({ rotation: 45 })
  })
})
