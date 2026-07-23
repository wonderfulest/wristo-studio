// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const warning = vi.hoisted(() => vi.fn())

vi.mock('element-plus', () => ({ ElMessage: { warning } }))
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, number>) =>
      params?.limit === undefined ? key : `${key}:${params.limit}`,
  }),
}))

import ProductTagSelector from './ProductTagSelector.vue'

const tags = [
  { id: 1, name: 'Minimal', slug: 'minimal', tagGroup: 'style', sort: 3, status: 1 },
  { id: 28, name: 'AMOLED', slug: 'amoled', tagGroup: 'function', sort: 2, status: 1 },
  { id: 38, name: 'Everyday', slug: 'everyday', tagGroup: 'scene', sort: 1, status: 1 },
]

const stubs = {
  ElFormItem: {
    props: ['label', 'prop'],
    template: '<section class="form-item" :data-label="label" :data-prop="prop"><slot /></section>',
  },
  ElSelect: {
    props: ['modelValue', 'multiple', 'filterable', 'placeholder', 'loading', 'disabled'],
    emits: ['change'],
    template: '<div class="select" :data-value="JSON.stringify(modelValue)" :data-multiple="multiple" :data-filterable="filterable" :data-placeholder="placeholder" :data-loading="loading" :data-disabled="disabled"><slot /></div>',
  },
  ElOption: {
    props: ['value', 'label'],
    template: '<span class="option" :data-value="value" :data-label="label" />',
  },
}

const mountSelector = (props: Record<string, unknown> = {}) =>
  mount(ProductTagSelector, {
    props: { tagIds: [1], tags, ...props },
    global: { stubs },
  })

describe('ProductTagSelector', () => {
  it('renders every tag group in API order', () => {
    const wrapper = mountSelector()

    expect(wrapper.get('.form-item').attributes()).toMatchObject({
      'data-label': 'productTags.label',
      'data-prop': 'tagIds',
    })
    expect(wrapper.findAll('.option').map(option => option.attributes('data-label'))).toEqual([
      'Minimal',
      'AMOLED',
      'Everyday',
    ])
    expect(wrapper.text()).toContain('productTags.tip:5')
  })

  it('emits unique IDs for a normal selection', async () => {
    const wrapper = mountSelector()

    wrapper.getComponent(stubs.ElSelect).vm.$emit('change', [28, 28, 38])
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:tagIds')).toEqual([[[28, 38]]])
  })

  it('keeps the previous five and warns when a sixth tag is selected', async () => {
    warning.mockClear()
    const wrapper = mountSelector({ tagIds: [1, 2, 3, 4, 5] })

    wrapper.getComponent(stubs.ElSelect).vm.$emit('change', [1, 2, 3, 4, 5, 6])
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:tagIds')).toEqual([[[1, 2, 3, 4, 5]]])
    expect(warning).toHaveBeenCalledWith('productTags.limit:5')
  })

  it('passes loading and disabled states to the select', () => {
    const wrapper = mountSelector({ loading: true, disabled: true })

    expect(wrapper.get('.select').attributes()).toMatchObject({
      'data-loading': 'true',
      'data-disabled': 'true',
    })
  })
})
