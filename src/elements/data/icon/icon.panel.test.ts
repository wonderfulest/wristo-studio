// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import IconPanel from './icon.panel.vue'
import { useHistoryStore } from '@/stores/historyStore'

vi.mock('opentype.js', () => ({
  default: {},
  parse: vi.fn(),
}))

vi.mock('@/utils/amoledIconCandidates', () => ({
  getAmoledIconCandidateFromElement: () => ({
    iconUnicode: '0063',
    symbolCode: '3',
    metricSymbol: 'calories',
    label: 'Cal',
    source: 'from-element',
  }),
}))

describe('icon settings panel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does not write the selected AMOLED icon back when the panel first mounts', async () => {
    const applyPatch = vi.fn()
    const wrapper = shallowMount(IconPanel, {
      props: {
        config: {
          id: 'calories-icon',
          eleType: 'icon',
          dataProperty: 'data_3',
          metricSymbol: 'calories',
          fontFamily: 'pulse-solid',
          fontSize: 30,
          iconSize: 30,
          iconDisplayType: 'amoled',
          amoledIconUnicode: '0063',
          amoledImageUrl: 'blob:https://studio.wristo.io/calories',
          text: 'c',
        },
        applyPatch,
      },
      global: {
        stubs: {
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-tabs': { template: '<div><slot /></div>' },
          'el-tab-pane': { template: '<div><slot /></div>' },
          'el-dialog': true,
          'el-button': true,
          'el-icon': true,
        },
      },
    })

    await vi.waitFor(() => expect(wrapper.findComponent(IconPanel).exists()).toBe(true))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(applyPatch).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('waits for the AMOLED config patch before recording the display change', async () => {
    let resolvePatch!: () => void
    const applyPatch = vi.fn(() => new Promise<void>((resolve) => {
      resolvePatch = resolve
    }))
    const historyStore = useHistoryStore()
    const saveState = vi.spyOn(historyStore, 'saveState')
    const wrapper = shallowMount(IconPanel, {
      props: {
        config: {
          id: 'calories-icon',
          eleType: 'icon',
          dataProperty: 'data_3',
          metricSymbol: 'calories',
          fontFamily: 'pulse-solid',
          fontSize: 30,
          iconSize: 30,
          iconDisplayType: 'mip',
          amoledIconUnicode: '0063',
          amoledImageUrl: 'blob:https://studio.wristo.io/calories',
          text: 'c',
        },
        applyPatch,
      },
      global: {
        stubs: {
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-tabs': {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<button class="select-amoled" @click="$emit(\'update:modelValue\', \'amoled\')"><slot /></button>',
          },
          'el-tab-pane': { template: '<div><slot /></div>' },
          'el-dialog': true,
          'el-button': true,
          'el-icon': true,
        },
      },
    })

    await wrapper.find('.select-amoled').trigger('click')
    await vi.waitFor(() => expect(applyPatch).toHaveBeenCalledTimes(1))

    expect(saveState).not.toHaveBeenCalledWith('icon-display-set:amoled')

    resolvePatch()
    await vi.waitFor(() => expect(saveState).toHaveBeenCalledWith('icon-display-set:amoled'))
    wrapper.unmount()
  })
})
