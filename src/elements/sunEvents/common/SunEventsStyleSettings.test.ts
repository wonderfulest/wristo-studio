// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/asset-picker/index.vue', () => ({ default: { name: 'AssetPicker', template: '<div />' } }))
vi.mock('@/components/color-picker/index.vue', () => ({
  default: { name: 'ColorPicker', props: ['modelValue'], template: '<button class="color-picker" />' },
}))

import SunEventsStyleSettings from './SunEventsStyleSettings.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import { lineSunEventsSchema } from '../lineSunEvents/lineSunEvents.schema'

const stubs = {
  ElInputNumber: true,
  ElSelect: true,
  ElOption: true,
  ElCheckbox: true,
  ElRadio: true,
  ElRadioGroup: { name: 'ElRadioGroup', props: ['modelValue'], template: '<div><slot /></div>' },
}

describe('Sun Events shared style settings', () => {
  it('shows one track color instead of phase controls in simple mode and emits its changes', async () => {
    const model = {
      ...lineSunEventsSchema.defaultConfig,
      displayMode: 'simple',
      simpleColor: '#123456',
      indicator: { ...lineSunEventsSchema.defaultConfig.indicator },
    }
    const wrapper = mount(SunEventsStyleSettings, {
      props: { model, mode: 'line' },
      global: { stubs },
    })

    expect(wrapper.findAll('.phase-row')).toHaveLength(0)
    const colors = wrapper.findAllComponents(ColorPicker)
    expect(colors.map((color) => color.props('modelValue'))).toEqual(['#123456', '#64748B'])

    await colors[0].vm.$emit('update:modelValue', '#ABCDEF')
    expect(wrapper.emitted('patch')?.at(-1)).toEqual([{ simpleColor: '#ABCDEF' }])
  })
})
