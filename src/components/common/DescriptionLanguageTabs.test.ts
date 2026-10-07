// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import DescriptionLanguageTabs from './DescriptionLanguageTabs.vue'
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
it('offers unused languages and selects the added language without duplicates', async () => {
  const wrapper = mount(DescriptionLanguageTabs, {
    props: { modelValue: 'en', languages: ['en', 'fr'] },
    global: { stubs: {
      ElButton: { template: '<button><slot/></button>' },
      ElSelect: { name: 'ElSelect', template: '<select><slot/></select>' },
      ElOption: { props: ['value', 'label'], template: '<option :value="value">{{ label }}</option>' },
      ElTabs: { template: '<div><slot/></div>' }, ElTabPane: true,
    } },
  })
  await wrapper.get('button').trigger('click')
  expect(wrapper.find('option[value="en"]').exists()).toBe(false)
  expect(wrapper.find('option[value="fr"]').exists()).toBe(false)
  expect(wrapper.find('option[value="ja"]').exists()).toBe(true)
  wrapper.getComponent({ name: 'ElSelect' }).vm.$emit('change', 'ja')
  expect(wrapper.emitted('add')).toEqual([['ja']])
  expect(wrapper.emitted('update:modelValue')).toEqual([['ja']])
})
