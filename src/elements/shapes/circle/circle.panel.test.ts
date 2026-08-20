// @vitest-environment jsdom

import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CirclePanel from './circle.panel.vue'

describe('circle.panel color bindings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('passes existing fill and stroke bindings to their color pickers', () => {
    const wrapper = shallowMount(CirclePanel, {
      props: {
        config: {
          id: 'circle-1',
          eleType: 'circle',
          fill: '#112233',
          fillProperty: 'surfaceColor',
          stroke: '#ffffff',
          strokeProperty: 'outlineColor',
        },
        applyPatch: vi.fn(),
      },
    })

    const pickers = wrapper.findAllComponents({ name: 'ColorPicker' })
    expect(pickers[0].props('propertyKey')).toBe('surfaceColor')
    expect(pickers[1].props('propertyKey')).toBe('outlineColor')
  })

  it('clears a stale stroke binding when a plain border color is selected', async () => {
    const applyPatch = vi.fn()
    const wrapper = shallowMount(CirclePanel, {
      props: {
        config: {
          id: 'circle-1',
          eleType: 'circle',
          stroke: '#ffffff',
          strokeProperty: 'color_1',
        },
        applyPatch,
      },
    })

    wrapper.findAllComponents({ name: 'ColorPicker' })[1].vm.$emit('property-change', {
      color: '#ffffff',
      propertyKey: null,
    })
    await wrapper.vm.$nextTick()

    expect(applyPatch).toHaveBeenCalledWith({ stroke: '#ffffff', strokeProperty: null })
  })
})
