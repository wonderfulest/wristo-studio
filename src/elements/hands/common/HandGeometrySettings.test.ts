// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const calibration = vi.hoisted(() => ({
  state: { active: false, selectedHandId: null as string | null, mode: 'hand' as 'hand' | 'pivot' },
  start: vi.fn(),
  stop: vi.fn(),
  syncMarker: vi.fn(),
}))

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('./handCalibration', () => ({
  handCalibrationState: calibration.state,
  startHandCalibration: calibration.start,
  stopHandCalibration: calibration.stop,
  syncHandCalibrationMarker: calibration.syncMarker,
}))

import HandGeometrySettings from './HandGeometrySettings.vue'

const ElInputNumber = {
  name: 'ElInputNumber',
  props: ['field', 'modelValue'],
  emits: ['change'],
  template: '<input :data-field="field" :value="modelValue" @change="$emit(\'change\', Number($event.target.value))" />',
}

describe('HandGeometrySettings', () => {
  it('shows absolute pivot coordinates and converts edits back to persisted offsets', async () => {
    const wrapper = mount(HandGeometrySettings, {
      props: {
        model: {
          centerX: 220,
          centerY: 200,
          pivotOffsetX: 7,
          pivotOffsetY: 27,
          scalePercent: 100,
        },
      },
      global: {
        stubs: {
          'el-input-number': ElInputNumber,
          'el-slider': true,
          'el-button': true,
          'el-segmented': true,
        },
      },
    })

    expect(wrapper.get('[data-field="pivotX"]').attributes('value')).toBe('227')
    expect(wrapper.get('[data-field="pivotY"]').attributes('value')).toBe('227')

    await wrapper.get('[data-field="pivotX"]').setValue('230')
    expect(wrapper.emitted('update')?.at(-1)).toEqual([{ pivotOffsetX: 10 }])
  })

  it('starts calibration for this hand without a drag-mode selector', async () => {
    calibration.state.active = false
    calibration.state.selectedHandId = null
    calibration.start.mockReturnValue(true)
    const wrapper = mount(HandGeometrySettings, {
      props: { model: { id: 'minute-1', centerX: 227, centerY: 227 } },
      global: {
        stubs: {
          'el-input-number': ElInputNumber,
          'el-slider': true,
          'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          'el-segmented': true,
        },
      },
    })

    await wrapper.get('.hand-calibration-button').trigger('click')
    expect(calibration.start).toHaveBeenCalledWith('minute-1')

    expect(wrapper.find('.calibration-mode').exists()).toBe(false)
  })
})
