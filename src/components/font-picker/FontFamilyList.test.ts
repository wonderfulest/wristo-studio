// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import FontFamilyList from './FontFamilyList.vue'
import type { FontItem } from '@/types/font-picker'

vi.mock('@/components/fonts/FontListItem.vue', () => ({
  default: {
    props: ['label'],
    template: '<div class="font-main">{{ label }}</div>'
  }
}))

const fonts: FontItem[] = [
  { value: 'kode-regular', family: 'Kode Mono', label: 'Kode Mono Regular', weightClass: 400 },
  { value: 'kode-bold', family: 'Kode Mono', label: 'Kode Mono Bold', weightClass: 700 },
  { value: 'inter-regular', family: 'Inter', label: 'Inter Regular', weightClass: 400 }
]

const mountList = (modelValue = '') =>
  mount(FontFamilyList, {
    props: { fonts, modelValue }
  })

describe('FontFamilyList', () => {
  it('collapses multi-weight families and leaves single-weight families directly selectable', () => {
    const wrapper = mountList()

    expect(wrapper.findAll('.font-family-summary')).toHaveLength(1)
    expect(wrapper.find('.font-family-summary').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.font-family-count').text()).toBe('2')
    expect(wrapper.findAll('.font-item').filter((item) => item.isVisible())).toHaveLength(1)
  })

  it('automatically expands the selected font family', () => {
    const wrapper = mountList('kode-bold')

    expect(wrapper.find('.font-family-summary').attributes('aria-expanded')).toBe('true')
    expect(wrapper.findAll('.font-item').filter((item) => item.isVisible())).toHaveLength(3)
    expect(wrapper.find('.font-item.active').text()).toContain('Kode Mono Bold')
  })

  it('toggles a family without selecting a font', async () => {
    const wrapper = mountList()

    await wrapper.find('.font-family-summary').trigger('click')

    expect(wrapper.find('.font-family-summary').attributes('aria-expanded')).toBe('true')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('emits the font when a weight is selected', async () => {
    const wrapper = mountList('kode-regular')

    await wrapper.findAll('.font-item')[1].trigger('click')

    expect(wrapper.emitted('select')?.[0]).toEqual([fonts[1]])
  })
})
