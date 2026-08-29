// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const clock = vi.hoisted(() => ({
  snapshot: {
    currentTime: new Date('2026-08-11T08:31:38.000Z'),
    speedMultiplier: 60,
    offsetMs: 0,
    isRunning: true,
  },
  pause: vi.fn(),
  reset: vi.fn(),
  resume: vi.fn(),
  setSpeed: vi.fn(),
  setTime: vi.fn(),
  updateCanvas: vi.fn(),
}))

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/engine/simulator/dataSimulatorEngine', () => ({
  getDataSimulatorEngine: () => ({ updateCanvas: clock.updateCanvas }),
}))
vi.mock('@/engine/simulator/simulatedClock', () => ({
  getSimulatedClockSnapshot: () => clock.snapshot,
  pauseSimulatedClock: clock.pause,
  resetSimulatedClock: clock.reset,
  resumeSimulatedClock: clock.resume,
  setSimulatedSpeed: clock.setSpeed,
  setSimulatedTime: clock.setTime,
}))
import TimeSimulatorPanel from './TimeSimulatorPanel.vue'

const mountPanel = () => mount(TimeSimulatorPanel, {
  global: {
    stubs: {
      Icon: true,
      ElButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
      ElDatePicker: {
        props: ['modelValue'],
        emits: ['update:modelValue', 'change', 'visible-change'],
        template: '<div><button class="open-picker" @click="$emit(\'visible-change\', true)" /><button class="date-picker" :data-value="modelValue.toISOString()" @click="$emit(\'update:modelValue\', new Date(\'2030-02-03T04:05:06.000Z\')); $emit(\'change\', new Date(\'2030-02-03T04:05:06.000Z\'))" /></div>',
      },
      ElSegmented: {
        props: ['modelValue', 'options'],
        emits: ['update:modelValue', 'change'],
        template: '<div><button class="fixed" @click="$emit(\'update:modelValue\', \'fixed\'); $emit(\'change\', \'fixed\')">fixed</button><button class="running" @click="$emit(\'update:modelValue\', \'running\'); $emit(\'change\', \'running\')">running</button></div>',
      },
      ElSlider: {
        props: ['modelValue', 'max'],
        emits: ['update:modelValue', 'input'],
        template: '<button :data-value="modelValue" @click="$emit(\'update:modelValue\', max === 1439 ? 754 : 7); $emit(\'input\', max === 1439 ? 754 : 7)" />',
      },
    },
  },
})

describe('TimeSimulatorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clock.snapshot = {
      currentTime: new Date('2026-08-11T08:31:38.000Z'),
      speedMultiplier: 60,
      offsetMs: 0,
      isRunning: true,
    }
    clock.reset.mockImplementation(() => {
      clock.snapshot = {
        currentTime: new Date('2026-08-11T08:31:38.000Z'),
        speedMultiplier: 1,
        offsetMs: 0,
        isRunning: true,
      }
      return clock.snapshot
    })
    clock.pause.mockImplementation(() => {
      clock.snapshot = {
        ...clock.snapshot,
        speedMultiplier: 0,
        isRunning: false,
      }
      return clock.snapshot
    })
    clock.resume.mockImplementation((speedMultiplier: number) => {
      clock.snapshot = {
        ...clock.snapshot,
        speedMultiplier,
        isRunning: true,
      }
      return clock.snapshot
    })
  })

  it('sets an exact simulated date and time and refreshes the canvas', async () => {
    const wrapper = mountPanel()

    await wrapper.get('.date-picker').trigger('click')

    expect(clock.setTime).toHaveBeenCalledWith(new Date('2030-02-03T04:05:06.000Z'))
    expect(clock.updateCanvas).toHaveBeenCalled()
  })

  it('does not overwrite the date-time value while the picker is being edited', async () => {
    vi.useFakeTimers()
    clock.snapshot = {
      currentTime: new Date('2026-08-11T08:31:38.000Z'),
      speedMultiplier: 0,
      offsetMs: 0,
      isRunning: false,
    }
    const wrapper = mountPanel()

    await wrapper.get('.open-picker').trigger('click')
    clock.snapshot = {
      ...clock.snapshot,
      currentTime: new Date('2026-08-29T07:37:33.000Z'),
    }
    await vi.advanceTimersByTimeAsync(500)

    expect(wrapper.get('.date-picker').attributes('data-value')).toBe('2026-08-11T08:31:38.000Z')
    wrapper.unmount()
    vi.useRealTimers()
  })

  it('switches between fixed mode and running mode without losing the selected speed', async () => {
    const wrapper = mountPanel()

    await wrapper.get('.fixed').trigger('click')
    expect(clock.pause).toHaveBeenCalled()

    await wrapper.get('.running').trigger('click')
    expect(clock.resume).toHaveBeenCalledWith(60)
  })

  it('shows only the control that belongs to the selected clock mode', async () => {
    const wrapper = mountPanel()

    expect(wrapper.find('.speed-control').exists()).toBe(true)
    expect(wrapper.find('.day-time-control').exists()).toBe(false)

    await wrapper.get('.fixed').trigger('click')
    expect(wrapper.find('.speed-control').exists()).toBe(false)
    expect(wrapper.find('.day-time-control').exists()).toBe(true)

    await wrapper.get('.running').trigger('click')
    expect(wrapper.find('.speed-control').exists()).toBe(true)
    expect(wrapper.find('.day-time-control').exists()).toBe(false)
  })

  it('maps a slider stop to the corresponding discrete multiplier', async () => {
    const wrapper = mountPanel()

    await wrapper.get('.speed-slider').trigger('click')

    expect(clock.setSpeed).toHaveBeenCalledWith(300)
  })

  it('sets the selected minute of the current day and switches to fixed mode', async () => {
    clock.snapshot = {
      currentTime: new Date(2026, 7, 29, 7, 37, 33, 456),
      speedMultiplier: 0,
      offsetMs: 0,
      isRunning: false,
    }
    const wrapper = mountPanel()

    await wrapper.get('.day-time-slider').trigger('click')

    expect(clock.pause).toHaveBeenCalledOnce()
    expect(clock.setTime).toHaveBeenCalledWith(new Date(2026, 7, 29, 12, 34, 0, 0))
    expect(clock.updateCanvas).toHaveBeenCalled()
    expect(wrapper.text()).toContain('12:34')
  })

  it('resets to now in running mode at 1x', async () => {
    const wrapper = mountPanel()

    await wrapper.get('.reset-button').trigger('click')

    expect(clock.reset).toHaveBeenCalled()
    expect(wrapper.text()).toContain('1x')
  })

  it('keeps hand calibration controls out of the time simulator', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('.calibration-button').exists()).toBe(false)
  })
})
