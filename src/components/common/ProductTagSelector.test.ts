// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const warning = vi.hoisted(() => vi.fn())

vi.mock('element-plus', () => ({ ElMessage: { warning } }))
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, number>) => (params?.limit === undefined ? key : `${key}:${params.limit}`)
  })
}))

import ProductTagSelector from './ProductTagSelector.vue'

const tags = [
  { id: 1, name: 'Minimal', slug: 'minimal', tagGroup: 'style', sort: 3, status: 1 },
  { id: 28, name: 'AMOLED', slug: 'amoled', tagGroup: 'function', sort: 2, status: 1 },
  { id: 38, name: 'Everyday', slug: 'everyday', tagGroup: 'scene', sort: 1, status: 1 }
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
  mount(ProductTagSelector, {
    props: { tagIds: [1], tags, ...props },
    global: { stubs }
  })

describe('ProductTagSelector', () => {
  it('renders every tag group in API order', () => {
    const wrapper = mountSelector()

    expect(wrapper.get('.form-item').attributes()).toMatchObject({
      'data-label': 'productTags.label',
      'data-prop': 'tagIds'
    })
    expect(wrapper.findAll('.option').map((option) => option.attributes('data-label'))).toEqual(['Minimal', 'AMOLED', 'Everyday'])
    expect(wrapper.text()).toContain('productTags.tip:20')
  })

  it('emits unique IDs for a normal selection', async () => {
    const wrapper = mountSelector()

    wrapper.getComponent(stubs.ElSelect).vm.$emit('change', [28, 28, 38])
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:tagIds')).toEqual([[[28, 38]]])
  })

  it('keeps the previous five and warns when a sixth tag is selected', async () => {
    warning.mockClear()
    const wrapper = mountSelector({ tagIds: [1, 2, 3, 4, 5], limit: 5 })

    wrapper.getComponent(stubs.ElSelect).vm.$emit('change', [1, 2, 3, 4, 5, 6])
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:tagIds')).toEqual([[[1, 2, 3, 4, 5]]])
    expect(warning).toHaveBeenCalledWith('productTags.limit:5')
  })

  it('passes loading and disabled states to the select', () => {
    const wrapper = mountSelector({ loading: true, disabled: true })

    expect(wrapper.get('.select').attributes()).toMatchObject({
      'data-loading': 'true',
      'data-disabled': 'true'
    })
  })
})

it('adds bulk matches and retains unmatched input', async () => {
  const wrapper = mountSelector()
  await wrapper.get('input').setValue('AMOLED，Everyday,Unknown')
  await wrapper.findAll('button')[0].trigger('click')
  expect(wrapper.emitted('update:tagIds')).toEqual([[[1, 28, 38]]])
  expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Unknown')
})
it('auto-fills relevant existing tags', async () => {
  const wrapper = mountSelector({ suggestionText: 'Everyday AMOLED' })
  await wrapper.findAll('button')[1].trigger('click')
  expect(wrapper.emitted('update:tagIds')).toEqual([[[1, 28, 38]]])
})

it('accepts twenty tags and rejects the twenty-first by default', async () => {
  const ids = Array.from({ length: 20 }, (_, index) => index + 1)
  const wrapper = mountSelector({ tagIds: ids })
  wrapper.getComponent(stubs.ElSelect).vm.$emit('change', ids)
  wrapper.getComponent(stubs.ElSelect).vm.$emit('change', [...ids, 21])
  await wrapper.vm.$nextTick()
  expect(wrapper.emitted('update:tagIds')).toEqual([[ids], [ids]])
  expect(warning).toHaveBeenCalledWith('productTags.limit:20')
})

it('auto-fills from the saved design and preserves manual selections', async () => {
  const wrapper = mountSelector({
    suggestionText: 'App BNLYRC',
    suggestionConfig: { elements: [{ eleType: 'time' }] },
    tags: [{ id: 2, name: 'Digital', slug: 'digital', tagGroup: 'style', sort: 0, status: 1 }]
  })
  await wrapper.findAll('button')[1].trigger('click')
  expect(wrapper.emitted('update:tagIds')).toEqual([[[1, 2]]])
})

it('adds a common tag even when the design name has no matching words', async () => {
  const wrapper = mountSelector({ suggestionText: 'App BNLYRC' })
  await wrapper.findAll('button')[1].trigger('click')
  expect(wrapper.emitted('update:tagIds')).toEqual([[[1, 38]]])
})

it('passes packaged devices to auto-fill and includes compatible model tags', async () => {
  const wrapper = mountSelector({
    supportedDeviceIds: 'fenix7,fr265',
    tags: [
      { id: 2, name: 'Fenix', slug: 'fenix', tagGroup: 'device', sort: 0, status: 1 },
      { id: 3, name: 'Forerunner', slug: 'forerunner', tagGroup: 'device', sort: 0, status: 1 },
      { id: 4, name: 'Venu', slug: 'venu', tagGroup: 'device', sort: 0, status: 1 }
    ]
  })
  await wrapper.findAll('button')[1].trigger('click')
  expect(wrapper.emitted('update:tagIds')).toEqual([[[1, 2, 3]]])
})
