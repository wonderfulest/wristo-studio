// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GoalBarPanel from './goalBar.panel.vue'

vi.mock('opentype.js', () => ({ default: {}, parse: vi.fn() }))

const SlotStub = { template: '<div><slot /></div>' }
const SwitchStub = {
  name: 'ElSwitch',
  props: ['modelValue'],
  emits: ['change'],
  template: '<button class="segment-switch" @click="$emit(\'change\', !modelValue)">switch</button>',
}

const mountPanel = (
  applyPatch = vi.fn(),
  props: Record<string, unknown> = {},
) => mount(GoalBarPanel, {
  props: {
    config: {
      id: 'goal-bar-1',
      eleType: 'goalBar',
      variant: 'continuous',
      segments: 10,
      gap: 2,
      padding: 1,
      progress: 0.5,
      shape: 'rectangle',
      progressDirection: 'leftToRight',
    },
    applyPatch,
    ...props,
  },
  global: {
    stubs: {
      GoalPropertyField: true,
      GoalBarPolygonMiniEditor: true,
      ColorPicker: true,
      Icon: true,
      'el-form': SlotStub,
      'el-form-item': SlotStub,
      'el-input-number': true,
      'el-slider': true,
      'el-alert': true,
      'el-button': { template: '<button><slot /></button>' },
      'el-switch': SwitchStub,
    },
  },
})

describe('goal bar segment mode interaction', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('toggles segment mode when the whole header is clicked', async () => {
    const applyPatch = vi.fn()
    const wrapper = mountPanel(applyPatch)

    const header = wrapper.get('.segment-mode-toggle-target')
    expect(header.attributes('type')).toBe('button')
    expect(header.attributes('aria-pressed')).toBe('false')

    await header.trigger('click')

    expect(applyPatch).toHaveBeenCalledTimes(1)
    expect(applyPatch).toHaveBeenCalledWith(expect.objectContaining({ variant: 'segmented' }))
  })

  it('does not toggle twice when the switch itself is clicked', async () => {
    const applyPatch = vi.fn()
    const wrapper = mountPanel(applyPatch)

    await wrapper.get('.segment-switch').trigger('click')

    expect(applyPatch).toHaveBeenCalledTimes(1)
    expect(applyPatch).toHaveBeenCalledWith(expect.objectContaining({ variant: 'segmented' }))
  })

  it('uses the persisted config when the canvas element has stale segment state', () => {
    const wrapper = mountPanel(vi.fn(), {
      element: {
        id: 'goal-bar-1',
        eleType: 'goalBar',
        variant: 'continuous',
      },
      config: {
        id: 'goal-bar-1',
        eleType: 'goalBar',
        variant: 'segmented',
        segments: 10,
        gap: 2,
        progress: 0.5,
        shape: 'rectangle',
        progressDirection: 'leftToRight',
      },
    })

    expect(wrapper.get('.segment-mode-toggle-target').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('.progress-bar-segment-body').exists()).toBe(true)
  })
})
