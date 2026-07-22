// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

import FontSizeSelect from './FontSizeSelect.vue'

describe('FontSizeSelect', () => {
  it('keeps the current font size visible when the select receives focus', async () => {
    const wrapper = mount(FontSizeSelect, {
      props: { modelValue: 42, options: [24, 42, 48] },
      global: { plugins: [ElementPlus] },
      attachTo: document.body,
    })

    await wrapper.get('.el-select__wrapper').trigger('click')

    expect(wrapper.get('.el-select__wrapper').classes()).not.toContain('is-filterable')
    expect(wrapper.get('.el-select__placeholder').text()).toContain('42px')
  })
})
