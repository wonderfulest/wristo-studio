// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/stores/designStore', () => ({
  useDesignStore: () => ({ appLanguage: 'eng' })
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({
    resolve: (route: { query?: Record<string, string> }) => ({
      href: `/tokens?${new URLSearchParams(route.query).toString()}`
    })
  })
}))

import TextTemplateEditor from './TextTemplateEditor.vue'
import { applyTokenEditorSession, readTokenEditorSession, tokenEditorResultStorageKey } from '@/views/tokens/tokenEditorTransfer'

const stubs = {
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue', 'input'],
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'input\')" />'
  },
  ElButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot/></button>'
  }
}

const mountEditor = () =>
  mount(TextTemplateEditor, {
    props: { modelValue: 'New Text', variablesInitiallyOpen: false },
    global: { stubs }
  })

describe('TextTemplateEditor token page handoff', () => {
  const openedWindow = { opener: window } as unknown as Window

  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(window, 'open').mockReturnValue(openedWindow)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the Tokens editor tab with the current field value', async () => {
    const wrapper = mountEditor()

    await wrapper.get('.open-token-editor').trigger('click')

    expect(wrapper.find('.token-dialog').exists()).toBe(false)
    expect(window.open).toHaveBeenCalledOnce()
    const [url, target, features] = vi.mocked(window.open).mock.calls[0]
    const sessionId = new URL(String(url), 'https://studio.wristo.io').searchParams.get('session')
    expect(target).toBe('_blank')
    expect(features).toBe('noopener')
    expect(new URL(String(url), 'https://studio.wristo.io').searchParams.get('tab')).toBe('editor')
    expect(readTokenEditorSession(sessionId || '')).toEqual({ value: 'New Text', appLanguage: 'eng', allowedVariables: [] })
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('applies the edited value back to the original field', async () => {
    const wrapper = mountEditor()
    await wrapper.get('.open-token-editor').trigger('click')
    const [url] = vi.mocked(window.open).mock.calls[0]
    const sessionId = new URL(String(url), 'https://studio.wristo.io').searchParams.get('session') || ''

    applyTokenEditorSession(sessionId, '(tm1).format("%04d")')
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: tokenEditorResultStorageKey(sessionId),
        newValue: '(tm1).format("%04d")',
        storageArea: localStorage
      })
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['(tm1).format("%04d")'])
    expect(wrapper.emitted('change')?.at(-1)).toEqual(['(tm1).format("%04d")'])
  })
})
