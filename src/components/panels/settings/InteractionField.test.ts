// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import InteractionField from './InteractionField.vue'
import { usePropertiesStore } from '@/stores/properties'
const Switch = defineComponent({ name: 'ElSwitch', emits: ['change'], template: '<button />' })
const Select = defineComponent({ name: 'ElSelect', props: ['modelValue'], emits: ['change'], template: '<div><slot /></div>' })
const config = { id: 'txt', eleType: 'text', left: 100, top: 100, originX: 'center', originY: 'center', textTemplate: 'Hello', fontFamily: 'Arial', fontSize: 36, fill: '#fff' } as any
function mount(extra = {}) {
  const applyPatch = vi.fn()
  const element = { ...config, getBoundingRect: () => ({ left: 70, top: 80, width: 60, height: 40 }), getXY: () => ({ x: 100, y: 100 }) }
  const wrapper = shallowMount(InteractionField, { props: { config: { ...config, ...extra }, element, applyPatch }, global: { stubs: {
    'el-switch': Switch, 'el-select': Select, 'el-option': true, 'el-form': { template: '<form><slot /></form>' }, 'el-form-item': { template: '<div><slot /></div>' }, 'el-input-number': true, 'el-button': true,
  } } })
  return { wrapper, applyPatch }
}
describe('Interaction entry on existing elements', () => {
  beforeEach(() => { setActivePinia(createPinia()) })
  it('enables a fixed target on text without modifying its display fields', async () => {
    const { wrapper, applyPatch } = mount()
    expect(wrapper.text()).toContain('Interaction')
    wrapper.findComponent(Switch).vm.$emit('change', true)
    expect(applyPatch).toHaveBeenCalledWith({ interaction: expect.objectContaining({ action: 'complication', target: 'fixed', bounds: { centerOffsetX: 0, centerOffsetY: 0, width: 60, height: 40 } }) })
    expect(Object.keys(applyPatch.mock.calls[0][0])).toEqual(['interaction'])
  })
  it('defaults recognized metrics to Follow Element and can turn the action off', () => {
    const { wrapper, applyPatch } = mount({ eleType: 'data', metricSymbol: ':FIELD_TYPE_HEART_RATE' })
    wrapper.findComponent(Switch).vm.$emit('change', true)
    expect(applyPatch.mock.calls[0][0].interaction.target).toBe('element')
    wrapper.findComponent(Switch).vm.$emit('change', false)
    expect(applyPatch).toHaveBeenLastCalledWith({ interaction: { action: 'none' } })
  })
  it.each(['data', 'goal'])('defaults mixed %s options to follow and shows display-only selections', async (type) => {
    const store = usePropertiesStore()
    store.properties.metric_1 = { type, title: 'Metric 1', value: 2, options: [
      { value: 1, label: 'Steps', metricSymbol: type === 'data' ? ':FIELD_TYPE_STEPS' : ':GOAL_TYPE_STEPS' },
      { value: 2, label: 'Unsupported Metric', metricSymbol: ':UNKNOWN' },
    ] } as any
    const extra = { eleType: type === 'data' ? 'icon' : 'goalArc', [type + 'Property']: 'metric_1', interaction: { action: 'none' } }
    const { wrapper, applyPatch } = mount(extra)
    wrapper.findComponent(Switch).vm.$emit('change', true)
    expect(applyPatch.mock.calls[0][0].interaction.target).toBe('element')
    await wrapper.setProps({ config: { ...config, ...extra, interaction: applyPatch.mock.calls[0][0].interaction } })
    expect(wrapper.text()).toContain('Linked Property: Metric 1')
    expect(wrapper.text()).toContain('Unsupported Metric')
    expect(wrapper.text()).toContain('no long-press area is registered')
    expect(wrapper.text()).not.toContain('Choose an available source before exporting')
    store.properties.metric_1.value = 1
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Opens: Steps')
    await wrapper.setProps({ config: { ...config, ...extra, interaction: { action: 'complication', target: 'fixed', complicationType: 18 } } as any })
    expect(wrapper.text()).toContain('Opens: Heart Rate')
    expect(wrapper.text()).not.toContain('Display only')
  })
  it('keeps the independent Complication settings as the sole entry for its own element', () => {
    const { wrapper } = mount({ eleType: 'complication' })
    expect(wrapper.find('[data-testid="element-interaction"]').exists()).toBe(false)
  })
})
