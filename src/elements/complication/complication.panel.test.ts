// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import Panel from './complication.panel.vue'
import { usePropertiesStore } from '@/stores/properties'
vi.mock('@/engine/managers/elementManager', () => ({ updateElement: vi.fn() }))
const Select = defineComponent({ name: 'ElSelect', props: ['modelValue'], emits: ['change'], template: '<div><slot /></div>' })
function mount(config: Record<string, any>) {
  const applyPatch = vi.fn()
  const wrapper = shallowMount(Panel, {
    props: { config, applyPatch },
    global: {
      stubs: {
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>' },
        'el-select': Select,
        'el-option': true,
        'el-button': true,
        'el-input-number': true,
        'el-switch': true,
        'el-color-picker': true
      }
    }
  })
  return { wrapper, applyPatch }
}
describe('Complication property groups', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  it('keeps content binding, style and hit shape edits independent', async () => {
    const { wrapper, applyPatch } = mount({ displayMode: 'iconValue', complicationType: 18, complicationProperty: 'complication_1', touchMode: 'auto' })
    expect(wrapper.findAll('h3').map((h) => h.text())).toEqual(['Content Source', 'Display Style', 'Touch Area'])
    wrapper.find('[data-testid="complication-touch-group"]').findAllComponents(Select)[1].vm.$emit('change', 'circle')
    expect(applyPatch).toHaveBeenLastCalledWith({ touchShape: 'circle' })
    wrapper.find('[data-testid="complication-display-group"]').findAllComponents(Select)[0].vm.$emit('change', 'progress')
    expect(applyPatch).toHaveBeenLastCalledWith({ displayMode: 'progress', displayWidth: 160, displayHeight: 160 })
    wrapper.find('[data-testid="complication-source-group"]').findAllComponents(Select)[0].vm.$emit('change', '')
    expect(applyPatch).toHaveBeenLastCalledWith({ complicationProperty: '' })
  })
  it('shows dynamic defaults and options and explains fixed custom icons', () => {
    usePropertiesStore().addProperty({
      key: 'complication_1',
      type: 'complication',
      title: 'Slot',
      defaultValue: 18,
      options: [
        { value: 18, label: 'Heart Rate' },
        { value: 2, label: 'Steps' }
      ]
    })
    const { wrapper } = mount({ displayMode: 'icon', iconSource: 'custom', customIcon: 'bike', complicationProperty: 'complication_1' })
    expect(wrapper.text()).toContain('Default: Heart Rate')
    expect(wrapper.text()).toContain('Allowed sources: Heart Rate, Steps')
    expect(wrapper.text()).toContain('The custom icon stays the same')
  })
})
