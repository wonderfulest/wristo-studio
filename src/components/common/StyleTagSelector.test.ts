// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const warning = vi.hoisted(() => vi.fn())

vi.mock('element-plus', () => ({
  ElMessage: { warning }
}))
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, number>) => (params?.limit === undefined ? key : `${key}:${params.limit}`)
  })
}))

import StyleTagSelector from './StyleTagSelector.vue'

const tags = [
  { id: 4, name: 'Minimal', slug: 'minimal', tagGroup: 'style', sort: 1, status: 1 },
  { id: 2, name: 'Sport', slug: 'sport', tagGroup: 'style', sort: 2, status: 1 }
]

const stubs = {
  ElFormItem: {
    props: ['label', 'prop'],
    template: '<section class="form-item" :data-label="label" :data-prop="prop"><slot /></section>'
  },
  ElSelect: {
    props: ['modelValue', 'multiple', 'filterable', 'placeholder', 'loading', 'disabled'],
    emits: ['change'],
    template:
      '<div class="select" :data-value="JSON.stringify(modelValue)" :data-multiple="multiple" :data-filterable="filterable" :data-placeholder="placeholder" :data-loading="loading" :data-disabled="disabled"><slot /></div>'
  },
  ElOption: {
    props: ['value', 'label'],
    template: '<span class="option" :data-value="value" :data-label="label" />'
  }
}

const mountSelector = (props: Record<string, unknown> = {}) =>
  mount(StyleTagSelector, {
    props: { tagIds: [4], tags, ...props },
    global: { stubs }
  })

describe('StyleTagSelector', () => {
  it('renders the localized form field and select contract with API option order', () => {
    const wrapper = mountSelector()
    const formItem = wrapper.get('.form-item')
    const select = wrapper.get('.select')

    expect(formItem.attributes()).toMatchObject({ 'data-label': 'styleTags.label', 'data-prop': 'tagIds' })
    expect(select.attributes()).toMatchObject({
      'data-value': '[4]',
      'data-multiple': '',
      'data-filterable': '',
      'data-placeholder': 'styleTags.placeholder'
    })
    expect(wrapper.findAll('.option').map((option) => [option.attributes('data-value'), option.attributes('data-label')])).toEqual([
      ['4', 'Minimal'],
      ['2', 'Sport']
    ])
    expect(wrapper.text()).toContain('styleTags.tip:5')
  })

  it('emits normalized IDs after a normal change', async () => {
    const wrapper = mountSelector()

    wrapper.getComponent(stubs.ElSelect).vm.$emit('change', [2, 2, 4])
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:tagIds')).toEqual([[[2, 4]]])
    expect(warning).not.toHaveBeenCalled()
  })

  it('preserves the capped current IDs and warns after an overflow change', async () => {
    warning.mockClear()
    const wrapper = mountSelector({ tagIds: [1, 2, 3, 4, 5], limit: 5 })

    wrapper.getComponent(stubs.ElSelect).vm.$emit('change', [1, 2, 3, 4, 5, 6])
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:tagIds')).toEqual([[[1, 2, 3, 4, 5]]])
    expect(warning).toHaveBeenCalledWith('styleTags.limit:5')
  })

  it('passes loading and explicit disabled state to the select', () => {
    const wrapper = mountSelector({ loading: true, disabled: true })

    expect(wrapper.get('.select').attributes()).toMatchObject({
      'data-loading': 'true',
      'data-disabled': 'true'
    })
  })
})
