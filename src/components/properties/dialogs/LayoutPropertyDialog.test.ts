// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import LayoutPropertyDialog from './LayoutPropertyDialog.vue'
import { usePropertiesStore } from '@/stores/properties'
import { useElementDataStore } from '@/stores/elementDataStore'

const global = { stubs: {
  ElDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot/><slot name="footer"/></div>' },
  ElForm: { template: '<div><slot/></div>' }, ElFormItem: { template: '<div><slot/></div>' },
  ElInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  ElButton: { props: ['disabled'], template: '<button :disabled="disabled"><slot/></button>' },
  ElSelect: { template: '<div><slot/></div>' }, ElOption: true, ElAlert: { props: ['title'], template: '<p role="alert">{{ title }}</p>' },
} }
describe('layout configuration dialog', () => {
  beforeEach(() => { setActivePinia(createPinia()) })
  it('never reuses a deleted option ID after saving and reopening', async () => {
    const properties = usePropertiesStore()
    properties.loadProperties({ layout: { type: 'layout', title: 'Layout', value: 1, options: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] } })
    const wrapper = mount(LayoutPropertyDialog, { global })
    ;(wrapper.vm as any).show()
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button').filter(button => button.text() === 'Remove')[1].trigger('click')
    await wrapper.findAll('button').find(button => button.text() === 'Save layouts')!.trigger('click')
    const first = wrapper.emitted('confirm')![0][0] as any
    expect(first.options.map((option: any) => option.value)).toEqual([1])
    expect(first.nextLayoutValue).toBe(3)
    properties.addProperty(first)
    ;(wrapper.vm as any).show()
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button').find(button => button.text() === 'Add layout')!.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === 'Save layouts')!.trigger('click')
    const second = wrapper.emitted('confirm')![1][0] as any
    expect(second.options.map((option: any) => option.value)).toEqual([1, 3])
    expect(second.nextLayoutValue).toBe(4)
  })

  it('blocks removing referenced options and rejects duplicate names', async () => {
    usePropertiesStore().loadProperties({ layout: { type: 'layout', title: 'Layout', value: 1, options: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] } })
    useElementDataStore().upsertElement({ id: 'heart', eleType: 'text', layoutVisibility: { propertyKey: 'layout', values: [1] } } as any)
    const wrapper = mount(LayoutPropertyDialog, { global })
    ;(wrapper.vm as any).show()
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('button').filter(button => button.text() === 'Remove')[0].attributes('disabled')).toBeDefined()
    await wrapper.find('input[aria-label="Layout 2 name"]').setValue('A')
    await wrapper.findAll('button').find(button => button.text() === 'Save layouts')!.trigger('click')
    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(wrapper.find('[role="alert"]').text()).toContain('unique')
  })
})
