// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DatePanel from './date.panel.vue'
import { useFontStore } from '@/stores/fontStore'

vi.mock('opentype.js', () => ({ default: {}, parse: vi.fn() }))

const SlotStub = { template: '<div><slot /></div>' }

describe('date settings panel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const fontStore = useFontStore()
    fontStore.fetchFonts = vi.fn().mockResolvedValue(undefined)
    fontStore.loadFont = vi.fn().mockResolvedValue(true)
  })

  it('links custom token users to the Studio token guide', () => {
    const wrapper = mount(DatePanel, {
      props: {
        config: {
          dateFormatMode: 'custom',
          dateTemplate: '(dt3)',
          fontFamily: '',
        },
        applyPatch: vi.fn(),
      },
      global: {
        stubs: {
          FontPicker: true,
          ColorPicker: true,
          AlignXButtons: true,
          FontSizeSelect: true,
          DatePropertyField: true,
          TextTemplateEditor: true,
          'el-form': SlotStub,
          'el-form-item': SlotStub,
          'el-select': SlotStub,
          'el-option': true,
        },
      },
    })

    const guide = wrapper.get('a.date-token-guide')
    expect(guide.text()).toContain('wristo.io/tokens')
    expect(guide.attributes('href')).toBe('https://studio.wristo.io/tokens')
    expect(guide.attributes('target')).toBe('_blank')
    expect(guide.attributes('rel')).toBe('noopener noreferrer')
  })
})
