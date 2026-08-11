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
        emits: ['update:modelValue', 'change'],
        template: '<button class="date-picker" @click="$emit(\'update:modelValue\', new Date(\'2030-02-03T04:05:06.000Z\')); $emit(\'change\', new Date(\'2030-02-03T04:05:06.000Z\'))" />',
      },
      ElSegmented: {
        props: ['modelValue', 'options'],
        emits: ['update:modelValue', 'change'],
        template: '<div><button class="fixed" @click="$emit(\'update:modelValue\', \'fixed\'); $emit(\'change\', \'fixed\')">fixed</button><button class="running" @click="$emit(\'update:modelValue\', \'running\'); $emit(\'change\', \'running\')">running</button></div>',
      },
      ElSlider: {
        props: ['modelValue'],
        emits: ['update:modelValue', 'input'],
        template: '<button class="speed" @click="$emit(\'update:modelValue\', 7); $emit(\'input\', 7)" />',
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
  })

  it('sets an exact simulated date and time and refreshes the canvas', async () => {
    const wrapper = mountPanel()

    await wrapper.get('.date-picker').trigger('click')

    expect(clock.setTime).toHaveBeenCalledWith(new Date('2030-02-03T04:05:06.000Z'))
    expect(clock.updateCanvas).toHaveBeenCalled()
  })

  it('switches between fixed mode and running mode without losing the selected speed', async () => {
    const wrapper = mountPanel()

    await wrapper.get('.fixed').trigger('click')
    expect(clock.pause).toHaveBeenCalled()

    await wrapper.get('.running').trigger('click')
    expect(clock.resume).toHaveBeenCalledWith(60)
  })

  it('maps a slider stop to the corresponding discrete multiplier', async () => {
    const wrapper = mountPanel()

    await wrapper.get('.speed').trigger('click')

    expect(clock.setSpeed).toHaveBeenCalledWith(300)
  })

  it('resets to now in running mode at 1x', async () => {
    const wrapper = mountPanel()

    await wrapper.get('.reset-button').trigger('click')

    expect(clock.reset).toHaveBeenCalled()
    expect(wrapper.text()).toContain('1x')
  })
})
