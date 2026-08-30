// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

import TokenTemplateEditorPanel from './TokenTemplateEditorPanel.vue'

describe('TokenTemplateEditorPanel', () => {
  it('uses the same search prompt as token lookup', () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: '', appLanguage: 'eng', actionLabel: 'Apply' }
    })

    expect(wrapper.get('.token-editor-search').attributes('placeholder')).toBe('tokens.searchPlaceholder')
  })

  it('filters tokens by their displayed name or code', async () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: '', appLanguage: 'eng', actionLabel: 'Apply' }
    })
    const search = wrapper.get('.token-editor-search')

    await search.setValue('Sunrise Time')
    expect(wrapper.find('[data-token-code="as2"]').exists()).toBe(true)
    expect(wrapper.find('[data-token-code="w01"]').exists()).toBe(false)

    await search.setValue('w01')
    expect(wrapper.find('[data-token-code="w01"]').exists()).toBe(true)
    expect(wrapper.find('[data-token-code="as2"]').exists()).toBe(false)
  })

  it.each(['Heart Rate', '心率', 'xinlv', 'xl'])('uses the token lookup search behavior for %s', async (query) => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: '', appLanguage: 'eng', actionLabel: 'Apply' }
    })

    await wrapper.get('.token-editor-search').setValue(query)

    expect(wrapper.find('[data-token-code="ds9"]').exists()).toBe(true)
  })

  it('shows the expression result from token lookup example values and refreshes it while editing', async () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: '(dt1) + (dt1.1) + (tm2)', appLanguage: 'eng', actionLabel: 'Apply' }
    })

    expect(wrapper.get('.token-editor-result-value').text()).toBe('2026268')

    await wrapper.get('textarea').setValue('(dt1) + "/" + (dt1.1) + "/" + (tm2)')

    expect(wrapper.get('.token-editor-result-value').text()).toBe('2026/26/8')
  })

  it('shows an empty state when no token matches the search', async () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: '', appLanguage: 'eng', actionLabel: 'Apply' }
    })

    await wrapper.get('.token-editor-search').setValue('no-such-token')

    expect(wrapper.findAll('.token-editor-chip')).toHaveLength(0)
    expect(wrapper.get('.token-editor-empty').text()).toBe('tokens.editor.searchEmpty')
  })

  it('shows every supported text and numeric format pattern below the result', () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: '(ai12)', appLanguage: 'eng', actionLabel: 'Apply' }
    })

    expect(wrapper.findAll('.token-format-pattern').map((item) => item.text())).toEqual([
      '%s',
      '%d',
      '%f',
      '%Wd / %Wf',
      '%0Wd / %0Wf',
      '%.Pf',
      '%W.Pf / %0W.Pf',
      '%,d / %,f / %,.Pf',
      '%,Wd / %,0Wd / %,W.Pf / %,0W.Pf'
    ])
    expect(wrapper.get('.token-format-legend').text()).toContain('tokens.guide.format.legend')
  })

  it('opens a compact preset editor for the nearest token and applies the format', async () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: '(dt1.1) + " " + (tm2)', appLanguage: 'eng', actionLabel: 'Apply' }
    })
    const textarea = wrapper.get('textarea').element as HTMLTextAreaElement
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)

    await wrapper.get('[data-format-preset="%06d"]').trigger('click')

    expect(wrapper.get('.token-format-editor-target').text()).toContain('(tm2)')
    expect(wrapper.get('.token-format-editor-code').text()).toBe('(tm2).format("%06d")')
    expect(wrapper.get('.token-format-editor-preview').text()).toBe('000008')

    await wrapper.get('.token-format-editor-apply').trigger('click')

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('(dt1.1) + " " + (tm2).format("%06d")')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['(dt1.1) + " " + (tm2).format("%06d")'])
  })

  it('updates width, precision and grouping in the live preview', async () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: '(ai12)', appLanguage: 'eng', actionLabel: 'Apply' }
    })
    const textarea = wrapper.get('textarea').element as HTMLTextAreaElement
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)

    await wrapper.get('[data-format-preset="%06.1f"]').trigger('click')
    await wrapper.get('[data-format-field="width"]').setValue('10')
    await wrapper.get('[data-format-field="precision"]').setValue('2')
    await wrapper.get('[data-format-field="grouped"]').setValue(true)

    expect(wrapper.get('.token-format-editor-code').text()).toBe('(ai12).format("%,010.2f")')
    expect(wrapper.get('.token-format-editor-preview').text()).toBe('008,240.00')
  })

  it('replaces an existing format call instead of appending a second one', async () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: '(tm2).format("%02d")', appLanguage: 'eng', actionLabel: 'Apply' }
    })
    const textarea = wrapper.get('textarea').element as HTMLTextAreaElement
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)

    await wrapper.get('[data-format-preset="%06d"]').trigger('click')
    await wrapper.get('.token-format-editor-apply').trigger('click')

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('(tm2).format("%06d")')
  })

  it('only enables text formatting for a string token', async () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: '(w02)', appLanguage: 'eng', actionLabel: 'Apply' }
    })
    const textarea = wrapper.get('textarea').element as HTMLTextAreaElement
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    await wrapper.get('textarea').trigger('select')

    expect(wrapper.get('[data-format-preset="%06d"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-format-preset="%s"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('[data-format-preset="%s"]').trigger('click')
    expect(wrapper.get('.token-format-editor-code').text()).toBe('(w02).format("%s")')
  })

  it('shows a target hint without changing the expression when no token is before the caret', async () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: 'Prefix (tm2)', appLanguage: 'eng', actionLabel: 'Apply' }
    })
    const textarea = wrapper.get('textarea').element as HTMLTextAreaElement
    textarea.setSelectionRange(2, 2)
    await wrapper.get('textarea').trigger('select')

    await wrapper.get('[data-format-preset="%06d"]').trigger('click')

    expect(wrapper.get('.token-format-editor-empty').text()).toBe('tokens.editor.formatTargetMissing')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('inserts a selected token at the textarea cursor', async () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: 'Before  After', appLanguage: 'eng', actionLabel: 'Apply' }
    })
    const textarea = wrapper.get('textarea').element as HTMLTextAreaElement
    textarea.setSelectionRange(7, 7)

    await wrapper.get('[data-token-code="tm1"]').trigger('click')

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Before (tm1) After')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Before (tm1) After'])
  })

  it('joins a second token with a space when it is clicked at the end of the expression', async () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: '(dt1.1)', appLanguage: 'eng', actionLabel: 'Apply' }
    })
    const textarea = wrapper.get('textarea').element as HTMLTextAreaElement
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)

    await wrapper.get('[data-token-code="tm2"]').trigger('click')

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('(dt1.1) + " " + (tm2)')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['(dt1.1) + " " + (tm2)'])
  })

  it('blocks apply while the template is invalid', async () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: '(tm1) +', appLanguage: 'eng', actionLabel: 'Apply' }
    })

    expect(wrapper.get('.token-editor-error').text()).not.toBe('')
    expect(wrapper.get('.token-editor-action').attributes('disabled')).toBeDefined()
    await wrapper.get('.token-editor-action').trigger('click')
    expect(wrapper.emitted('apply')).toBeUndefined()
  })

  it('emits the valid edited expression when apply is clicked', async () => {
    const wrapper = mount(TokenTemplateEditorPanel, {
      props: { modelValue: '(tm1)', appLanguage: 'eng', actionLabel: 'Apply' }
    })

    await wrapper.get('.token-editor-action').trigger('click')

    expect(wrapper.emitted('apply')).toEqual([['(tm1)']])
  })
})
