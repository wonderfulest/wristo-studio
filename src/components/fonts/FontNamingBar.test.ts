// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

import FontNamingBar from './FontNamingBar.vue'

const stubs = {
  ElInput: {
    inheritAttrs: false,
    props: ['modelValue'],
    emits: ['update:modelValue', 'blur'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'blur\')" />',
  },
  ElSelect: { template: '<div class="el-select-stub"><slot /></div>' },
  ElOption: true,
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
  ElIcon: { template: '<span><slot /></span>' },
  Refresh: true,
}

describe('FontNamingBar', () => {
  it('uses one simple slug field for icon fonts', async () => {
    const wrapper = mount(FontNamingBar, { props: { type: 'icon' }, global: { stubs } })

    expect(wrapper.find('.naming-field--simple').exists()).toBe(true)
    expect(wrapper.find('.naming-bar').exists()).toBe(false)
    expect(wrapper.find('.naming-preview-value').text()).toBe('font.namePlaceholder')

    await wrapper.find('.naming-field--simple input').setValue('Animal Cute')
    await nextTick()

    expect(wrapper.find('.naming-preview-value').text()).toBe('animal-cute')
    expect((wrapper.vm as any).fontName).toBe('Animal Cute')

    expect(typeof (wrapper.vm as any).setName).toBe('function')
    ;(wrapper.vm as any).setName('Ink Wash Mono')
    await nextTick()
    expect(wrapper.find('.naming-preview-value').text()).toBe('ink-wash-mono')
  })

  it('keeps the existing four-part fields for number fonts', () => {
    const wrapper = mount(FontNamingBar, { props: { type: 'number' }, global: { stubs } })

    expect(wrapper.find('.naming-field--simple').exists()).toBe(false)
    expect(wrapper.find('.naming-bar').exists()).toBe(true)
  })
})
