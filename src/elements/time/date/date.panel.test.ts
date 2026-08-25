// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DatePanel from './date.panel.vue'
import { useFontStore } from '@/stores/fontStore'
import { validateCustomDateTemplate } from './dateTemplate'

vi.mock('opentype.js', () => ({ default: {}, parse: vi.fn() }))

const SlotStub = { template: '<div><slot name="label" /><slot /></div>' }

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
          'el-button': { template: '<button><slot /></button>' },
        },
      },
    })

    const guide = wrapper.get('a.date-token-guide')
    expect(guide.text()).toContain('wristo.io/tokens')
    expect(guide.attributes('href')).toBe('https://studio.wristo.io/tokens')
    expect(guide.attributes('target')).toBe('_blank')
    expect(guide.attributes('rel')).toBe('noopener noreferrer')
  })

  it('replaces the custom template with a valid random date template', async () => {
    const applyPatch = vi.fn()
    const currentTemplate = '(dt2) + "." + (dt3) + "." + (dt5.1)'
    const wrapper = mount(DatePanel, {
      props: {
        config: {
          dateFormatMode: 'custom',
          dateTemplate: currentTemplate,
          fontFamily: '',
        },
        applyPatch,
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
          'el-button': { template: '<button><slot /></button>' },
        },
      },
    })

    await wrapper.get('button.date-template-random').trigger('click')

    const patch = applyPatch.mock.calls.at(-1)?.[0]
    expect(patch.dateFormatMode).toBe('custom')
    expect(patch.dateTemplate).not.toBe(currentTemplate)
    expect(validateCustomDateTemplate(patch.dateTemplate)).toEqual([])
  })
})
