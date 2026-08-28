// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/stores/designStore', () => ({
  useDesignStore: () => ({ appLanguage: 'en' }),
}))

import TextTemplateEditor from './TextTemplateEditor.vue'

const stubs = {
  ElDialog: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<div v-if="modelValue" class="dialog"><slot/><slot name="footer"/></div>',
  },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue', 'input'],
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'input\')" />',
  },
  ElButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot/></button>',
  },
}

const mountEditor = () => mount(TextTemplateEditor, {
  props: { modelValue: 'New Text', variablesInitiallyOpen: false },
  global: { stubs },
})

describe('TextTemplateEditor token dialog', () => {
  it('keeps dialog edits as a draft until confirmation', async () => {
    const wrapper = mountEditor()

    await wrapper.get('.open-token-editor').trigger('click')
    const dialogInput = wrapper.get('.token-dialog textarea')
    await dialogInput.setValue('"Year: " + (dt1)')

    expect(wrapper.emitted('change')).toBeUndefined()

    await wrapper.get('.confirm-token-edit').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['"Year: " + (dt1)'])
    expect(wrapper.emitted('change')?.at(-1)).toEqual(['"Year: " + (dt1)'])
  })

  it('discards the draft when the dialog is cancelled', async () => {
    const wrapper = mountEditor()

    await wrapper.get('.open-token-editor').trigger('click')
    await wrapper.get('.token-dialog textarea').setValue('Discard me')
    await wrapper.get('.cancel-token-edit').trigger('click')
    await wrapper.get('.open-token-editor').trigger('click')

    expect((wrapper.get('.token-dialog textarea').element as HTMLTextAreaElement).value).toBe('New Text')
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('inserts a token into the dialog draft without changing the outer value', async () => {
    const wrapper = mountEditor()

    await wrapper.get('.open-token-editor').trigger('click')
    await wrapper.get('.token-dialog .variable-chip').trigger('click')

    expect((wrapper.get('.token-dialog textarea').element as HTMLTextAreaElement).value).not.toBe('New Text')
    expect(wrapper.emitted('change')).toBeUndefined()
  })
})
