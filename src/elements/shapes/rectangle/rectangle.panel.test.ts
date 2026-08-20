// @vitest-environment jsdom

import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RectanglePanel from './rectangle.panel.vue'

describe('rectangle.panel color bindings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('passes existing fill and stroke bindings to their color pickers', () => {
    const wrapper = shallowMount(RectanglePanel, {
      props: {
        config: {
          id: 'rectangle-1',
          eleType: 'rectangle',
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

  it('updates the fill color and binding when a color variable is selected', async () => {
    const applyPatch = vi.fn()
    const wrapper = shallowMount(RectanglePanel, {
      props: {
        config: {
          id: 'rectangle-1',
          eleType: 'rectangle',
          fill: '#112233',
        },
        applyPatch,
      },
    })

    wrapper.findAllComponents({ name: 'ColorPicker' })[0].vm.$emit('property-change', {
      color: '#445566',
      propertyKey: 'surfaceColor',
    })
    await wrapper.vm.$nextTick()

    expect(applyPatch).toHaveBeenCalledWith({ fill: '#445566', fillProperty: 'surfaceColor' })
  })

  it('clears a stale stroke binding when a plain border color is selected', async () => {
    const applyPatch = vi.fn()
    const wrapper = shallowMount(RectanglePanel, {
      props: {
        config: {
          id: 'rectangle-1',
          eleType: 'rectangle',
          stroke: '#ffffff',
          strokeProperty: 'outlineColor',
        },
        applyPatch,
      },
    })

    wrapper.findAllComponents({ name: 'ColorPicker' })[1].vm.$emit('property-change', {
      color: '#778899',
      propertyKey: null,
    })
    await wrapper.vm.$nextTick()

    expect(applyPatch).toHaveBeenCalledWith({ stroke: '#778899', strokeProperty: null })
  })
})
