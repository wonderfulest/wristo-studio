// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TextPanel from './text.panel.vue'
import { useFontStore } from '@/stores/fontStore'
import { FontTypes } from '@/config/fonts'

vi.mock('opentype.js', () => ({ default: {}, parse: vi.fn() }))

describe('text settings panel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const fontStore = useFontStore()
    fontStore.fetchFonts = vi.fn().mockResolvedValue(undefined)
    fontStore.loadFont = vi.fn().mockResolvedValue(true)
  })

  it('limits the font picker to text fonts', () => {
    const wrapper = mount(TextPanel, {
      props: {
        config: {
          id: 'text-1',
          fontFamily: '',
        },
        applyPatch: vi.fn(),
      },
      global: {
        stubs: {
          FontPicker: { name: 'FontPicker', props: ['type'], template: '<div />' },
          TextVariableEditor: true,
          AlignXButtons: true,
          FontSizeSelect: true,
          ColorPicker: true,
        },
      },
    })

    expect(wrapper.getComponent({ name: 'FontPicker' }).props('type')).toBe(FontTypes.TEXT_FONT)
  })
})
