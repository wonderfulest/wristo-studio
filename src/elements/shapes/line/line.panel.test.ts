// @vitest-environment jsdom

import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LinePanel from './line.panel.vue'

describe('line.panel color binding', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('passes the existing stroke binding to the color picker', () => {
    const wrapper = shallowMount(LinePanel, {
      props: {
        config: {
          id: 'line-1',
          eleType: 'line',
          stroke: '#ffffff',
          strokeProperty: 'outlineColor',
        },
        applyPatch: vi.fn(),
      },
    })

    expect(wrapper.findComponent({ name: 'ColorPicker' }).props('propertyKey')).toBe('outlineColor')
  })

  it('clears a stale stroke binding when a plain line color is selected', async () => {
    const applyPatch = vi.fn()
    const wrapper = shallowMount(LinePanel, {
      props: {
        config: {
          id: 'line-1',
          eleType: 'line',
          stroke: '#ffffff',
          strokeProperty: 'color_1',
        },
        applyPatch,
      },
    })

    wrapper.findComponent({ name: 'ColorPicker' }).vm.$emit('property-change', {
      color: '#ffffff',
      propertyKey: null,
    })
    await wrapper.vm.$nextTick()

    expect(applyPatch).toHaveBeenCalledWith({ stroke: '#ffffff', strokeProperty: null })
  })
})
